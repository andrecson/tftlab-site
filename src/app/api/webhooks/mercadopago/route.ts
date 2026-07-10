import { type NextRequest, NextResponse } from "next/server";

import {
  fetchMpAuthorizedPayment,
  fetchMpPayment,
  fetchMpPreapproval,
  verifyMpSignature,
} from "@/lib/payments/mercadopago";
import {
  handleApprovedMpPix,
  handleMpAuthorizedPayment,
  handleMpPreapproval,
  markEventProcessed,
  unmarkEvent,
} from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mercado Pago webhook (PAY-010). Handles the three notification types the
 * transparent checkout produces:
 *   - `payment`                          → one-time Pix approved
 *   - `subscription_preapproval`         → card subscription status change
 *   - `subscription_authorized_payment`  → a recurring charge was processed
 * Validates `x-signature`, re-reads the resource via the API (never trusts the
 * payload), and dedupes by a per-resource idempotency key.
 * Endpoint to register in MP: https://<site>/api/webhooks/mercadopago
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const url = req.nextUrl;
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  const resourceId = dataId ?? (body.data?.id != null ? String(body.data.id) : null);
  const type =
    body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");

  // Verify the signature when a secret is configured (MP signs the query data.id).
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  if (
    secret &&
    !verifyMpSignature(
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
      dataId ?? resourceId,
      secret,
    )
  ) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  if (!resourceId || !type) return NextResponse.json({ received: true });

  const accessToken = process.env.MP_ACCESS_TOKEN ?? "";

  try {
    switch (type) {
      case "payment": {
        const payment = await fetchMpPayment(resourceId, accessToken);
        if (!payment || payment.status !== "approved") {
          return NextResponse.json({ received: true });
        }
        const key = `payment:${payment.id}`;
        if (!(await markEventProcessed("MERCADOPAGO", key))) {
          return NextResponse.json({ received: true, duplicate: true });
        }
        try {
          const email = payment.payer?.email
            ? payment.payer.email.trim().toLowerCase()
            : null;
          await handleApprovedMpPix({
            externalReference: payment.external_reference ?? null,
            email,
            mpPaymentId: String(payment.id),
            paidAt: new Date(),
          });
        } catch (err) {
          await unmarkEvent("MERCADOPAGO", key);
          throw err;
        }
        return NextResponse.json({ received: true });
      }

      case "subscription_preapproval": {
        const pre = await fetchMpPreapproval(resourceId, accessToken);
        if (!pre) return NextResponse.json({ received: true });
        // Key on id+status so status transitions each process once.
        const key = `preapproval:${pre.id}:${pre.status}`;
        if (!(await markEventProcessed("MERCADOPAGO", key))) {
          return NextResponse.json({ received: true, duplicate: true });
        }
        try {
          await handleMpPreapproval({
            preapprovalId: pre.id,
            status: pre.status,
            externalReference: pre.external_reference ?? null,
            nextPaymentDate: pre.next_payment_date
              ? new Date(pre.next_payment_date)
              : null,
            paidAt: new Date(),
          });
        } catch (err) {
          await unmarkEvent("MERCADOPAGO", key);
          throw err;
        }
        return NextResponse.json({ received: true });
      }

      case "subscription_authorized_payment": {
        const ap = await fetchMpAuthorizedPayment(resourceId, accessToken);
        if (!ap || !ap.preapproval_id) {
          return NextResponse.json({ received: true });
        }
        const approved =
          ap.payment?.status === "approved" || ap.status === "processed";
        const key = `authpay:${ap.id}`;
        if (!(await markEventProcessed("MERCADOPAGO", key))) {
          return NextResponse.json({ received: true, duplicate: true });
        }
        try {
          await handleMpAuthorizedPayment({
            preapprovalId: ap.preapproval_id,
            approved,
            paidAt: new Date(),
          });
        } catch (err) {
          await unmarkEvent("MERCADOPAGO", key);
          throw err;
        }
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("[mp webhook]", err);
    return new NextResponse("handler error", { status: 500 });
  }
}
