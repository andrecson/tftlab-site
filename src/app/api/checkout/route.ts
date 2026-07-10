import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { isPlanInterval, type PlanInterval } from "@/lib/payments/config";
import {
  createMpCardSubscription,
  createMpPixPayment,
} from "@/lib/payments/mercadopago";
import { SITE_URL } from "@/lib/site";
import { db } from "@/server/db";
import {
  handleMpPreapproval,
  linkPendingSubscriber,
} from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Charged amount (whole BRL) per plan; env-overridable. */
function amountBRL(plan: PlanInterval): number {
  const raw = plan === "year" ? process.env.MP_PRICE_YEAR : process.env.MP_PRICE_MONTH;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return plan === "year" ? 480 : 80;
}

type Method = "pix" | "card";
function isMethod(v: unknown): v is Method {
  return v === "pix" || v === "card";
}

/**
 * Transparent checkout entry point (PAY-009). Creates the MP charge server-side
 * and returns JSON for the client to render (Pix QR) or confirm (card). Works
 * for a logged-in customer (attributed to their Subscriber) or a guest
 * (attributed to a fresh GuestCheckout token, linked to Discord after payment).
 */
export async function POST(req: NextRequest) {
  let body: {
    plan?: string;
    method?: string;
    email?: string;
    name?: string;
    cpf?: string;
    cardToken?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "payload" }, { status: 400 });
  }

  const plan = body.plan;
  const method = body.method;
  if (!isPlanInterval(plan) || !isMethod(method)) {
    return NextResponse.json({ error: "parametros" }, { status: 400 });
  }
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "indisponivel" }, { status: 503 });
  }

  const session = await auth();
  const discordId = session?.user?.discordId ?? null;
  const sessionEmail = session?.user?.email ?? null;
  const email = (body.email?.trim() || sessionEmail || "").toLowerCase() || null;

  const origin = (SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const title = `TFTLab ${plan === "year" ? "Anual" : "Mensal"}`;
  const amount = amountBRL(plan);

  // Attribution reference: the Subscriber id (logged in) or a guest token.
  let externalReference: string;
  let guestToken: string | null = null;
  if (discordId) {
    const sub = await linkPendingSubscriber({
      discordId,
      discordUsername: session?.user?.discordUsername ?? null,
      email,
      plan,
      provider: "MERCADOPAGO",
      paymentMethod: method === "pix" ? "PIX" : "CARD",
    });
    externalReference = sub.id;
  } else {
    if (!email) {
      return NextResponse.json({ error: "email" }, { status: 400 });
    }
    guestToken = randomUUID();
    await db.guestCheckout.create({
      data: {
        checkoutToken: guestToken,
        plan,
        method: method === "pix" ? "PIX" : "CARD",
        email,
        amountBRL: amount,
      },
    });
    externalReference = guestToken;
  }

  if (method === "pix") {
    if (!email) {
      return NextResponse.json({ error: "email" }, { status: 400 });
    }
    const pix = await createMpPixPayment({
      accessToken,
      amount,
      description: title,
      payerEmail: email,
      payerFirstName: body.name?.trim() || session?.user?.name || null,
      payerCpf: body.cpf ? body.cpf.replace(/\D/g, "") : null,
      externalReference,
    });
    if (!pix) {
      return NextResponse.json({ error: "pix" }, { status: 502 });
    }
    return NextResponse.json({
      method: "pix",
      paymentId: pix.id,
      status: pix.status,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
      ticketUrl: pix.ticketUrl,
      guestToken,
    });
  }

  // Card (recurring subscription). The token was created in the browser (Bricks).
  if (!body.cardToken || !email) {
    return NextResponse.json({ error: "cartao" }, { status: 400 });
  }
  const sub = await createMpCardSubscription({
    accessToken,
    plan,
    amount,
    reason: title,
    payerEmail: email,
    cardTokenId: body.cardToken,
    externalReference,
    backUrl: `${origin}/conta`,
  });
  if (!sub) {
    return NextResponse.json({ error: "cartao_recusado" }, { status: 502 });
  }
  // Authorized → grant access right away; the webhook is the backstop.
  if (sub.status === "authorized") {
    await handleMpPreapproval({
      preapprovalId: sub.id,
      status: "authorized",
      externalReference,
      nextPaymentDate: null,
      paidAt: new Date(),
    });
  }
  return NextResponse.json({
    method: "card",
    status: sub.status,
    preapprovalId: sub.id,
    guestToken,
  });
}
