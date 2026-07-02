import type { PaymentProvider } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

import {
  discordDisplayName,
  exchangeDiscordCode,
  fetchDiscordUser,
  joinGuild,
} from "@/lib/discord";
import { MP_LINKS, STRIPE_LINKS } from "@/lib/marketing";
import {
  isPlanInterval,
  isProviderSlug,
  type PlanInterval,
  type ProviderSlug,
} from "@/lib/payments/config";
import { verifyState } from "@/lib/oauth-state";
import { SITE_URL } from "@/lib/site";
import { linkPendingSubscriber } from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(req: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/planos?erro=${code}`, req.nextUrl.origin));
}

/** Build the hosted-checkout URL, tagging it so the webhook can attribute it. */
function checkoutUrl(
  provider: ProviderSlug,
  plan: PlanInterval,
  subscriberId: string,
  email: string | null,
): string {
  if (provider === "stripe") {
    // Stripe Payment Links echo client_reference_id back in the webhook.
    const url = new URL(STRIPE_LINKS[plan]);
    url.searchParams.set("client_reference_id", subscriberId);
    if (email) url.searchParams.set("prefilled_email", email);
    return url.toString();
  }
  // Mercado Pago short links can't carry a reference → matched by payer email.
  return MP_LINKS[plan];
}

/**
 * Step 2: Discord returns here. Verify the state/nonce, exchange the code, add
 * the user to the guild (no role yet), upsert a PENDING subscriber, then send
 * them to the hosted checkout. The payment webhook grants the role.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = verifyState(params.get("state"));
  const nonce = req.cookies.get("discord_oauth_nonce")?.value;

  if (!code || !state || !nonce || state.nonce !== nonce) return fail(req, "vinculo");
  if (!isPlanInterval(state.plan) || !isProviderSlug(state.provider)) return fail(req, "vinculo");

  const origin = (SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const redirectUri = `${origin}/api/discord/callback`;

  const token = await exchangeDiscordCode(code, redirectUri);
  if (!token) return fail(req, "discord");
  const user = await fetchDiscordUser(token.access_token);
  if (!user) return fail(req, "discord");

  // Add them to the server now (role granted later, by the webhook).
  await joinGuild(user.id, token.access_token);

  const email = user.email ? user.email.trim().toLowerCase() : null;
  const provider: PaymentProvider = state.provider === "stripe" ? "STRIPE" : "MERCADOPAGO";
  const sub = await linkPendingSubscriber({
    discordId: user.id,
    discordUsername: discordDisplayName(user),
    email,
    plan: state.plan,
    provider,
  });

  const res = NextResponse.redirect(checkoutUrl(state.provider, state.plan, sub.id, email));
  res.cookies.delete("discord_oauth_nonce");
  return res;
}
