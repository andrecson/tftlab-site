import type { PaymentProvider, Subscriber } from "@prisma/client";

import { grantRole, revokeRole } from "@/lib/discord";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { oneTimePeriodEnd, type PlanInterval } from "@/lib/payments/config";
import { db } from "@/server/db";

/**
 * Server-side subscription orchestration: the single place that mutates a
 * `Subscriber`, grants/revokes the Discord role, and enforces webhook
 * idempotency. Called only from the payment/OAuth route handlers.
 */

/**
 * Record a provider event id; returns false if it was already recorded (the
 * unique [provider, eventId] constraint). Providers retry webhooks, so callers
 * must no-op on false to avoid double-processing.
 */
export async function markEventProcessed(
  provider: PaymentProvider,
  eventId: string,
): Promise<boolean> {
  try {
    await db.webhookEvent.create({ data: { provider, eventId } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Undo `markEventProcessed` when the handler threw AFTER claiming the event, so
 * the provider's retry reprocesses it instead of hitting the dedupe and losing
 * it forever.
 */
export async function unmarkEvent(
  provider: PaymentProvider,
  eventId: string,
): Promise<void> {
  await db.webhookEvent.deleteMany({ where: { provider, eventId } });
}

/**
 * Upsert the PENDING subscriber created when the buyer links Discord (before
 * checkout). Refreshes contact fields + chosen plan/provider; never downgrades
 * an already-ACTIVE subscriber back to PENDING (e.g. if they re-link).
 */
export async function linkPendingSubscriber(input: {
  discordId: string;
  discordUsername: string | null;
  email: string | null;
  plan: PlanInterval;
  provider: PaymentProvider;
}): Promise<Subscriber> {
  const existing = await db.subscriber.findUnique({ where: { discordId: input.discordId } });
  const keepStatus = existing?.status === "ACTIVE";
  return db.subscriber.upsert({
    where: { discordId: input.discordId },
    create: {
      discordId: input.discordId,
      discordUsername: input.discordUsername,
      email: input.email,
      plan: input.plan,
      provider: input.provider,
      status: "PENDING",
    },
    update: {
      discordUsername: input.discordUsername,
      email: input.email,
      plan: input.plan,
      provider: input.provider,
      ...(keepStatus ? {} : { status: "PENDING" }),
    },
  });
}

/** Stripe `checkout.session.completed`: bind the subscription + grant the role. */
export async function activateByStripeCheckout(input: {
  subscriberId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  currentPeriodEnd: Date;
}): Promise<void> {
  const sub = await db.subscriber.findUnique({ where: { id: input.subscriberId } });
  if (!sub) return;
  const granted = await grantRole(sub.discordId);
  await db.subscriber.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      provider: "STRIPE",
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      currentPeriodEnd: input.currentPeriodEnd,
      roleGranted: granted,
    },
  });
  // Best-effort confirmation email (no-ops if SMTP isn't configured; the send
  // helper never throws, so it can't break the webhook).
  if (sub.email) {
    await sendPaymentConfirmationEmail({ to: sub.email, plan: sub.plan });
  }
}

/**
 * Stripe subscription lifecycle (`customer.subscription.updated`, `invoice.paid`):
 * keep the role in sync with the subscription's status + period end.
 */
export async function syncStripeSubscription(input: {
  stripeSubscriptionId: string;
  grantsAccess: boolean;
  currentPeriodEnd: Date;
}): Promise<void> {
  const sub = await db.subscriber.findUnique({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
  });
  if (!sub) return;
  if (input.grantsAccess) {
    const granted = await grantRole(sub.discordId);
    await db.subscriber.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", currentPeriodEnd: input.currentPeriodEnd, roleGranted: granted },
    });
  } else {
    await revokeRole(sub.discordId);
    await db.subscriber.update({
      where: { id: sub.id },
      data: { status: "CANCELED", currentPeriodEnd: input.currentPeriodEnd, roleGranted: false },
    });
  }
}

/** Stripe `customer.subscription.deleted`: revoke access. */
export async function cancelStripeSubscription(stripeSubscriptionId: string): Promise<void> {
  const sub = await db.subscriber.findUnique({ where: { stripeSubscriptionId } });
  if (!sub) return;
  await revokeRole(sub.discordId);
  await db.subscriber.update({
    where: { id: sub.id },
    data: { status: "CANCELED", roleGranted: false },
  });
}

/**
 * Mercado Pago approved (one-time) payment. There is no Discord id in the
 * payment, so we attribute it to the most recent subscriber that linked Discord
 * with the same payer email. Returns the matched subscriber, or null if none.
 */
export async function activateByMpPayment(input: {
  email: string | null;
  mpPaymentId: string;
  paidAt: Date;
}): Promise<Subscriber | null> {
  if (!input.email) return null;
  const sub = await db.subscriber.findFirst({
    where: { email: input.email },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return null;
  const plan: PlanInterval = sub.plan === "year" ? "year" : "month";
  const granted = await grantRole(sub.discordId);
  const updated = await db.subscriber.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      provider: "MERCADOPAGO",
      mpPaymentId: input.mpPaymentId,
      currentPeriodEnd: oneTimePeriodEnd(plan, input.paidAt),
      roleGranted: granted,
    },
  });
  // Best-effort confirmation email (no-ops without SMTP; never throws).
  if (updated.email) {
    await sendPaymentConfirmationEmail({ to: updated.email, plan });
  }
  return updated;
}

/**
 * Cron backstop: expire ACTIVE subscribers whose access window has passed and
 * pull their Discord role. Catches one-time (MP) lapses and any Stripe sub that
 * failed to renew without emitting a cancel. Returns how many were expired.
 */
export async function expireLapsedSubscribers(now: Date = new Date()): Promise<number> {
  const lapsed = await db.subscriber.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lt: now } },
  });
  for (const sub of lapsed) {
    await revokeRole(sub.discordId);
    await db.subscriber.update({
      where: { id: sub.id },
      data: { status: "EXPIRED", roleGranted: false },
    });
  }
  return lapsed.length;
}
