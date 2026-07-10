"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCustomer } from "@/auth";
import {
  cancelSubscriberSubscription,
  linkGuestCheckoutToDiscord,
} from "@/server/subscriptions";

/** Cancel the current customer's recurring subscription (PAY-012). */
export async function cancelMySubscription(): Promise<void> {
  const { discordId } = await requireCustomer("/conta");
  await cancelSubscriberSubscription(discordId);
  revalidatePath("/conta");
}

/**
 * Bind a paid guest checkout to the logged-in customer and grant access, then
 * go to /conta (PAY-014). Requires a customer session (redirects to /entrar
 * otherwise, returning here after login).
 */
export async function linkGuestPurchase(token: string): Promise<void> {
  const back = `/checkout/sucesso?token=${encodeURIComponent(token)}`;
  const { discordId, discordUsername, email } = await requireCustomer(back);
  const res = await linkGuestCheckoutToDiscord({
    token,
    discordId,
    discordUsername,
    email,
  });
  redirect(res.ok ? "/conta" : `${back}&erro=${res.reason ?? "falha"}`);
}
