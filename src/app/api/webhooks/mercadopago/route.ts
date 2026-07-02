import { type NextRequest, NextResponse } from "next/server";

import { fetchMpPayment, verifyMpSignature } from "@/lib/payments/mercadopago";
import {
  activateByMpPayment,
  markEventProcessed,
  unmarkEvent,
} from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mercado Pago webhook (one-time payments). Validates the `x-signature`, reads
 * the payment via the API to confirm it's `approved`, then grants the Discord
 * role to the subscriber matched by payer email.
 * Endpoint to register in MP: https://<site>/api/webhooks/mercadopago
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const url = req.nextUrl;
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  const paymentId = dataId ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = body.type ?? url.searchParams.get("type");

  // Verify the signature when a secret is configured (MP signs the query data.id).
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  if (
    secret &&
    !verifyMpSignature(
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
      dataId ?? paymentId,
      secret,
    )
  ) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  if (type !== "payment" || !paymentId) return NextResponse.json({ received: true });

  // Never trust the notification's status — read the payment from the API.
  const payment = await fetchMpPayment(paymentId, process.env.MP_ACCESS_TOKEN ?? "");
  if (!payment || payment.status !== "approved") {
    return NextResponse.json({ received: true });
  }

  // Only approved payments consume an idempotency key, so an earlier "pending"
  // notification for the same id never blocks the "approved" one.
  const key = `payment:${payment.id}`;
  if (!(await markEventProcessed("MERCADOPAGO", key))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const email = payment.payer?.email ? payment.payer.email.trim().toLowerCase() : null;
    await activateByMpPayment({ email, mpPaymentId: String(payment.id), paidAt: new Date() });
  } catch (err) {
    console.error("[mp webhook]", err);
    await unmarkEvent("MERCADOPAGO", key); // let MP retry
    return new NextResponse("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
