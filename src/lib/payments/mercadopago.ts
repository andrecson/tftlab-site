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

/**
 * Create a Checkout Pro preference so the payment carries an `external_reference`
 * (the subscriber id) — the webhook then matches on that instead of the fragile
 * payer email. Returns the hosted `init_point` URL, or null on error (caller
 * falls back to the static link). The app-level webhook (configured in the MP
 * panel) delivers the notification, so no `notification_url` is set here.
 */
export async function createMpPreference(input: {
  accessToken: string;
  title: string;
  amount: number;
  externalReference: string;
  payerEmail: string | null;
  backUrl: string;
}): Promise<string | null> {
  if (!input.accessToken || !(input.amount > 0)) return null;
  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
            currency_id: "BRL",
          },
        ],
        external_reference: input.externalReference,
        ...(input.payerEmail ? { payer: { email: input.payerEmail } } : {}),
        // MP is Pix/boleto only here — card (recurring) goes through Stripe.
        payment_methods: {
          excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
        },
        back_urls: {
          success: input.backUrl,
          pending: input.backUrl,
          failure: input.backUrl,
        },
        auto_return: "approved",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { init_point?: string };
    return data.init_point ?? null;
  } catch {
    return null;
  }
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
