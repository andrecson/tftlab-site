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
import { createMpPreference } from "@/lib/payments/mercadopago";
import { verifyState } from "@/lib/oauth-state";
import { SITE_URL } from "@/lib/site";
import { linkPendingSubscriber } from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(req: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/planos?erro=${code}`, req.nextUrl.origin));
}

/** BRL amount charged for a one-time MP payment (env-overridable per plan). */
function mpAmountBRL(plan: PlanInterval): number {
  const raw =
    plan === "year" ? process.env.MP_PRICE_YEAR : process.env.MP_PRICE_MONTH;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return plan === "year" ? 480 : 80; // defaults — confirme no .env
}

/** Build the hosted-checkout URL, tagging it so the webhook can attribute it. */
async function checkoutUrl(
  provider: ProviderSlug,
  plan: PlanInterval,
  subscriberId: string,
  email: string | null,
  origin: string,
): Promise<string> {
  if (provider === "stripe") {
    // Stripe Payment Links echo client_reference_id back in the webhook.
    const url = new URL(STRIPE_LINKS[plan]);
    url.searchParams.set("client_reference_id", subscriberId);
    if (email) url.searchParams.set("prefilled_email", email);
    return url.toString();
  }
  // Mercado Pago: create a preference carrying external_reference = subscriberId
  // so the webhook matches on it (not the fragile payer email). Prefills the
  // Discord email too. Falls back to the static short link if the API call fails.
  const initPoint = await createMpPreference({
    accessToken: process.env.MP_ACCESS_TOKEN ?? "",
    title: `TFTLab ${plan === "year" ? "Anual" : "Mensal"}`,
    amount: mpAmountBRL(plan),
    externalReference: subscriberId,
    payerEmail: email,
    backUrl: `${origin}/planos?assinatura=ok`,
  });
  return initPoint ?? MP_LINKS[plan];
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

  const checkout = await checkoutUrl(state.provider, state.plan, sub.id, email, origin);
  const res = NextResponse.redirect(checkout);
  res.cookies.delete("discord_oauth_nonce");
  return res;
}
