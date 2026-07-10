import { type NextRequest, NextResponse } from "next/server";

import { fetchMpPayment } from "@/lib/payments/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pix status poll (PAY-008/009). The checkout page polls this after showing the
 * QR; when the payment reads `approved`, the client advances (to /conta for a
 * logged-in buyer, or to the guest link page). The webhook does the actual
 * activation + role grant; this endpoint only reports the payment's status.
 */
export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ error: "parametros" }, { status: 400 });
  }
  const payment = await fetchMpPayment(paymentId, process.env.MP_ACCESS_TOKEN ?? "");
  return NextResponse.json({ status: payment?.status ?? "unknown" });
}
