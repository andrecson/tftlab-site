import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Mercado Pago webhook support WITHOUT the MP SDK. Verifies the `x-signature`
 * header per MP's manifest spec, then reads the payment via the REST API to
 * confirm it was actually `approved` (the notification itself is not trusted).
 * MP payments are ONE-TIME here, so there is no renewal event.
 */

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Validate MP's `x-signature`. MP builds the manifest as
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (segments omitted when the
 * corresponding value is absent) and HMAC-SHA256s it with the webhook secret.
 * Alphanumeric ids must be lowercased in the manifest.
 */
export function verifyMpSignature(
  xSignature: string | null | undefined,
  xRequestId: string | null | undefined,
  dataId: string | null | undefined,
  secret: string,
): boolean {
  if (!xSignature || !secret || !dataId) return false;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "ts") ts = val;
    else if (key === "v1") v1 = val;
  }
  if (!ts || !v1) return false;
  const manifest =
    `id:${dataId.toLowerCase()};` +
    (xRequestId ? `request-id:${xRequestId};` : "") +
    `ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqualHex(v1, expected);
}

export interface MpPayment {
  id: number | string;
  status: string; // "approved" | "pending" | "rejected" | ...
  status_detail?: string;
  external_reference?: string | null;
  payer?: { email?: string | null };
  transaction_amount?: number;
}

/** Fetch a payment from the MP REST API to confirm its real status. */
export async function fetchMpPayment(
  paymentId: string,
  accessToken: string,
): Promise<MpPayment | null> {
  if (!accessToken) return null;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPayment;
}
