import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, stateless CSRF token for the Discord OAuth round-trip. The buyer's
 * chosen plan/provider ride in the `state` param through Discord and back; a
 * random `nonce` is echoed against an httpOnly cookie on the callback so a
 * forged callback can't complete the link. Signed with `AUTH_SECRET` (HMAC),
 * so it can't be tampered with. Pure + secret injectable → unit-testable.
 */
export interface OAuthState {
  plan: string;
  provider: string;
  nonce: string;
}

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function signState(
  state: OAuthState,
  secret: string = process.env.AUTH_SECRET ?? "",
): string {
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyState(
  token: string | null | undefined,
  secret: string = process.env.AUTH_SECRET ?? "",
): OAuthState | null {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqualHex(sig, hmac(payload, secret))) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      obj &&
      typeof obj.plan === "string" &&
      typeof obj.provider === "string" &&
      typeof obj.nonce === "string"
    ) {
      return obj as OAuthState;
    }
    return null;
  } catch {
    return null;
  }
}
