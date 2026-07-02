import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Stripe webhook support WITHOUT the Stripe SDK (keeps the Docker image
 * lean). Verifies the `Stripe-Signature` header the way Stripe's library does
 * (HMAC-SHA256 over `${t}.${rawBody}`) and reads the subscription via the REST
 * API to learn the real `current_period_end`.
 */

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify a `Stripe-Signature` header against the raw request body. `nowSeconds`
 * / `toleranceSeconds` are injectable for tests; the default rejects payloads
 * whose timestamp is more than 5 minutes off (replay protection).
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  if (!signatureHeader || !secret) return false;
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t") timestamp = val;
    else if (key === "v1") signatures.push(val);
  }
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (toleranceSeconds > 0 && Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return signatures.some((sig) => safeEqualHex(sig, expected));
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/** Parse the raw webhook body into an event, or null when malformed. */
export function parseStripeEvent(rawBody: string): StripeEvent | null {
  try {
    const obj = JSON.parse(rawBody);
    if (obj && typeof obj.id === "string" && typeof obj.type === "string" && obj.data?.object) {
      return obj as StripeEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export interface StripeSubscription {
  id: string;
  status: string; // active | trialing | past_due | canceled | unpaid | ...
  current_period_end: number; // unix seconds
  customer: string;
}

/** Fetch a subscription via the Stripe REST API (no SDK). */
export async function fetchStripeSubscription(
  subscriptionId: string,
  secretKey: string,
): Promise<StripeSubscription | null> {
  if (!secretKey) return null;
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as StripeSubscription;
}

/** Stripe subscription statuses that should keep the Discord role applied. */
export function stripeStatusGrantsAccess(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}
