import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { discordAuthUrl, discordConfigured } from "@/lib/discord";
import { isPlanInterval, isProviderSlug } from "@/lib/payments/config";
import { signState } from "@/lib/oauth-state";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of checkout: send the buyer through Discord OAuth so we can attribute
 * the (hosted) payment to their Discord account. `?plan=month|year` +
 * `?provider=stripe|mp` are signed into the OAuth `state` and echoed back on the
 * callback (with a nonce cookie for CSRF).
 */
export function GET(req: NextRequest) {
  if (!discordConfigured()) {
    return NextResponse.redirect(new URL("/planos?erro=indisponivel", req.nextUrl.origin));
  }
  const plan = req.nextUrl.searchParams.get("plan");
  const provider = req.nextUrl.searchParams.get("provider");
  if (!isPlanInterval(plan) || !isProviderSlug(provider)) {
    return NextResponse.redirect(new URL("/planos?erro=parametros", req.nextUrl.origin));
  }

  const origin = (SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const redirectUri = `${origin}/api/discord/callback`;
  const nonce = randomUUID();
  const state = signState({ plan, provider, nonce });

  const res = NextResponse.redirect(discordAuthUrl(redirectUri, state));
  res.cookies.set("discord_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
