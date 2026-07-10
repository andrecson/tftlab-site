import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

/**
 * Mercado Pago integration WITHOUT the MP SDK (plain REST + fetch). Covers:
 *   - webhook signature verification (`verifyMpSignature`) + payment lookup;
 *   - transparent checkout: one-time Pix (`createMpPixPayment`) and recurring
 *     card subscriptions via preapproval (`createMpCardSubscription`).
 * The notification is never trusted: handlers re-read the resource via the API
 * to confirm its real status.
 */

const MP_API = "https://api.mercadopago.com";

/** Truncated response body for error logs (never throws). */
async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

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

// ---------------------------------------------------------------------------
// Transparent checkout (PAY-007): create the charge server-side; the browser
// renders the Pix QR / tokenizes the card (Bricks). No redirect to MP.
// ---------------------------------------------------------------------------

export interface MpPixResult {
  id: string;
  status: string; // "pending" until paid, then "approved"
  qrCode: string | null; // copy-and-paste Pix string
  qrCodeBase64: string | null; // base64 PNG (no data: prefix)
  ticketUrl: string | null; // MP-hosted fallback voucher
}

/**
 * Create a one-time Pix payment. Returns the QR (image + copy-and-paste) to
 * render on our own page; the webhook confirms `approved` later.
 * `externalReference` attributes it (subscriber id or guest checkout token).
 * MP requires the payer e-mail for Pix; CPF/name are sent when collected.
 */
export async function createMpPixPayment(input: {
  accessToken: string;
  amount: number;
  description: string;
  payerEmail: string;
  payerFirstName?: string | null;
  payerCpf?: string | null; // digits only
  externalReference: string;
  idempotencyKey?: string;
}): Promise<MpPixResult | null> {
  if (!input.accessToken || !input.payerEmail || !(input.amount > 0)) return null;
  const payer: Record<string, unknown> = { email: input.payerEmail };
  if (input.payerFirstName) payer.first_name = input.payerFirstName;
  if (input.payerCpf) payer.identification = { type: "CPF", number: input.payerCpf };
  try {
    const res = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey ?? randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: input.description,
        payment_method_id: "pix",
        external_reference: input.externalReference,
        payer,
      }),
    });
    if (!res.ok) {
      console.error("[mp] createMpPixPayment failed", res.status, await safeText(res));
      return null;
    }
    const data = (await res.json()) as {
      id?: number | string;
      status?: string;
      point_of_interaction?: {
        transaction_data?: {
          qr_code?: string;
          qr_code_base64?: string;
          ticket_url?: string;
        };
      };
    };
    if (data.id == null) return null;
    const td = data.point_of_interaction?.transaction_data;
    return {
      id: String(data.id),
      status: data.status ?? "pending",
      qrCode: td?.qr_code ?? null,
      qrCodeBase64: td?.qr_code_base64 ?? null,
      ticketUrl: td?.ticket_url ?? null,
    };
  } catch (err) {
    console.error("[mp] createMpPixPayment error", err);
    return null;
  }
}

/**
 * Recurring cadence for a plan. MP `frequency_type` only supports "days" and
 * "months", so the yearly plan is 12 months (charged R$X once every 12 months).
 * Exported for unit testing.
 */
export function planAutoRecurring(plan: "month" | "year", amount: number) {
  return {
    frequency: plan === "year" ? 12 : 1,
    frequency_type: "months" as const,
    transaction_amount: amount,
    currency_id: "BRL" as const,
  };
}

export interface MpPreapprovalResult {
  id: string;
  status: string; // "authorized" when the first charge succeeded
  initPoint: string | null;
}

/**
 * Create a recurring card subscription (MP preapproval) from a card token
 * generated in the browser (Bricks) — transparent, no redirect. With
 * `status: "authorized"` MP charges the first cycle immediately and schedules
 * the rest. Returns the preapproval id + status, or null on error.
 */
export async function createMpCardSubscription(input: {
  accessToken: string;
  plan: "month" | "year";
  amount: number;
  reason: string;
  payerEmail: string;
  cardTokenId: string;
  externalReference: string;
  backUrl: string;
  idempotencyKey?: string;
}): Promise<MpPreapprovalResult | null> {
  if (!input.accessToken || !input.cardTokenId || !(input.amount > 0)) return null;
  try {
    const res = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey ?? randomUUID(),
      },
      body: JSON.stringify({
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        card_token_id: input.cardTokenId,
        auto_recurring: planAutoRecurring(input.plan, input.amount),
        back_url: input.backUrl,
        status: "authorized",
      }),
    });
    if (!res.ok) {
      console.error("[mp] createMpCardSubscription failed", res.status, await safeText(res));
      return null;
    }
    const data = (await res.json()) as {
      id?: string;
      status?: string;
      init_point?: string;
    };
    if (!data.id) return null;
    return {
      id: data.id,
      status: data.status ?? "pending",
      initPoint: data.init_point ?? null,
    };
  } catch (err) {
    console.error("[mp] createMpCardSubscription error", err);
    return null;
  }
}

export interface MpPreapproval {
  id: string;
  status: string; // "authorized" | "paused" | "cancelled" | "pending"
  external_reference?: string | null;
  payer_email?: string | null;
  next_payment_date?: string | null;
}

/** Read a preapproval (subscription) to confirm its real status. */
export async function fetchMpPreapproval(
  preapprovalId: string,
  accessToken: string,
): Promise<MpPreapproval | null> {
  if (!accessToken) return null;
  const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPreapproval;
}

/** Cancel a subscription. Returns true on success (200). */
export async function cancelMpPreapproval(
  preapprovalId: string,
  accessToken: string,
): Promise<boolean> {
  if (!accessToken || !preapprovalId) return false;
  try {
    const res = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    });
    return res.ok;
  } catch (err) {
    console.error("[mp] cancelMpPreapproval error", err);
    return false;
  }
}

export interface MpAuthorizedPayment {
  id: number | string;
  status: string; // "processed" | "scheduled" | "recycling" | ...
  preapproval_id?: string | null;
  payment?: { id?: number | string | null; status?: string | null } | null;
}

/**
 * Read an "authorized payment" (a single recurring charge of a subscription),
 * delivered as `subscription_authorized_payment` webhooks. Its `preapproval_id`
 * ties the charge back to the subscription; `payment.status` is the real result.
 */
export async function fetchMpAuthorizedPayment(
  authorizedPaymentId: string,
  accessToken: string,
): Promise<MpAuthorizedPayment | null> {
  if (!accessToken) return null;
  const res = await fetch(
    `${MP_API}/authorized_payments/${authorizedPaymentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  return (await res.json()) as MpAuthorizedPayment;
}
