import type { PaymentMethod, PaymentProvider, Subscriber } from "@prisma/client";

import { grantRole, revokeRole } from "@/lib/discord";
import {
  sendGuestLinkEmail,
  sendPaymentConfirmationEmail,
  sendRenewalReminderEmail,
} from "@/lib/email";
import { oneTimePeriodEnd, type PlanInterval } from "@/lib/payments/config";
import { cancelMpPreapproval } from "@/lib/payments/mercadopago";
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
  paymentMethod?: PaymentMethod;
}): Promise<Subscriber> {
  const existing = await db.subscriber.findUnique({ where: { discordId: input.discordId } });
  const keepStatus = existing?.status === "ACTIVE";
  const method = input.paymentMethod ? { paymentMethod: input.paymentMethod } : {};
  return db.subscriber.upsert({
    where: { discordId: input.discordId },
    create: {
      discordId: input.discordId,
      discordUsername: input.discordUsername,
      email: input.email,
      plan: input.plan,
      provider: input.provider,
      status: "PENDING",
      ...method,
    },
    update: {
      discordUsername: input.discordUsername,
      email: input.email,
      plan: input.plan,
      provider: input.provider,
      ...method,
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
 * Grant access for an approved one-time (Pix) payment: role + ACTIVE + a fresh
 * one-time access window. Clears the cancel/reminder markers.
 */
async function activatePixSubscriber(
  sub: Subscriber,
  mpPaymentId: string,
  paidAt: Date,
): Promise<Subscriber> {
  const plan: PlanInterval = sub.plan === "year" ? "year" : "month";
  const granted = await grantRole(sub.discordId);
  const updated = await db.subscriber.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      provider: "MERCADOPAGO",
      paymentMethod: "PIX",
      mpPaymentId,
      currentPeriodEnd: oneTimePeriodEnd(plan, paidAt),
      roleGranted: granted,
      canceledAt: null,
      renewalRemindedAt: null,
    },
  });
  // Best-effort confirmation email (no-ops without SMTP; never throws).
  if (updated.email) {
    await sendPaymentConfirmationEmail({ to: updated.email, plan });
  }
  return updated;
}

/**
 * Mark a guest checkout paid (awaiting the Discord link, PAY-013/014) and email
 * the buyer the link to finish binding (PAY-015). Best-effort email.
 */
export async function markGuestCheckoutPaid(
  guestId: string,
  input: {
    mpPaymentId?: string;
    mpPreapprovalId?: string;
    paidAt: Date;
    email: string | null;
  },
): Promise<void> {
  const guest = await db.guestCheckout.update({
    where: { id: guestId },
    data: {
      status: "PAID",
      ...(input.mpPaymentId ? { mpPaymentId: input.mpPaymentId } : {}),
      ...(input.mpPreapprovalId ? { mpPreapprovalId: input.mpPreapprovalId } : {}),
      paidAt: input.paidAt,
      ...(input.email ? { email: input.email } : {}),
    },
  });
  if (guest.email) {
    await sendGuestLinkEmail({
      to: guest.email,
      token: guest.checkoutToken,
      plan: guest.plan,
    });
  }
}

/**
 * Attribute an approved MP Pix payment (transparent checkout, PAY-010).
 * `externalReference` is a Subscriber.id (logged-in) or a
 * GuestCheckout.checkoutToken (guest); falls back to the payer email for legacy
 * static-link payments. For a guest, the payment is recorded but NO role is
 * granted yet — the buyer must link Discord first (PAY-014).
 */
export async function handleApprovedMpPix(input: {
  externalReference: string | null;
  email: string | null;
  mpPaymentId: string;
  paidAt: Date;
}): Promise<"subscriber" | "guest" | "none"> {
  const ref = input.externalReference?.trim() || null;
  if (ref) {
    const sub = await db.subscriber.findUnique({ where: { id: ref } });
    if (sub) {
      await activatePixSubscriber(sub, input.mpPaymentId, input.paidAt);
      return "subscriber";
    }
    const guest = await db.guestCheckout.findUnique({
      where: { checkoutToken: ref },
    });
    if (guest) {
      await markGuestCheckoutPaid(guest.id, {
        mpPaymentId: input.mpPaymentId,
        paidAt: input.paidAt,
        email: input.email,
      });
      return "guest";
    }
  }
  if (input.email) {
    const sub = await db.subscriber.findFirst({
      where: { email: input.email },
      orderBy: { createdAt: "desc" },
    });
    if (sub) {
      await activatePixSubscriber(sub, input.mpPaymentId, input.paidAt);
      return "subscriber";
    }
  }
  return "none";
}

/**
 * Handle a subscription (preapproval) status change (PAY-010). `authorized`
 * grants access; `paused`/`cancelled` stop future charges but keep access until
 * currentPeriodEnd (the cron revokes at expiry). external_reference is a
 * Subscriber.id (logged-in) or GuestCheckout.checkoutToken (guest).
 */
export async function handleMpPreapproval(input: {
  preapprovalId: string;
  status: string;
  externalReference: string | null;
  nextPaymentDate: Date | null;
  paidAt: Date;
}): Promise<void> {
  const grants = input.status === "authorized";
  let sub = await db.subscriber.findUnique({
    where: { mpPreapprovalId: input.preapprovalId },
  });
  if (!sub && input.externalReference) {
    sub = await db.subscriber.findUnique({
      where: { id: input.externalReference },
    });
  }
  if (sub) {
    const plan: PlanInterval = sub.plan === "year" ? "year" : "month";
    if (grants) {
      const granted = await grantRole(sub.discordId);
      const wasActive = sub.status === "ACTIVE";
      const updated = await db.subscriber.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          provider: "MERCADOPAGO",
          paymentMethod: "CARD",
          mpPreapprovalId: input.preapprovalId,
          currentPeriodEnd:
            input.nextPaymentDate ?? oneTimePeriodEnd(plan, input.paidAt),
          roleGranted: granted,
          canceledAt: null,
        },
      });
      if (!wasActive && updated.email) {
        await sendPaymentConfirmationEmail({ to: updated.email, plan });
      }
    } else {
      // paused / cancelled: keep access until currentPeriodEnd; mark canceled.
      await db.subscriber.update({
        where: { id: sub.id },
        data: { canceledAt: sub.canceledAt ?? input.paidAt },
      });
    }
    return;
  }
  // Guest card subscription: attach the preapproval to the guest checkout.
  if (grants && input.externalReference) {
    const guest = await db.guestCheckout.findUnique({
      where: { checkoutToken: input.externalReference },
    });
    if (guest) {
      await markGuestCheckoutPaid(guest.id, {
        mpPreapprovalId: input.preapprovalId,
        paidAt: input.paidAt,
        email: guest.email,
      });
    }
  }
}

/**
 * A recurring charge of a card subscription was processed
 * (subscription_authorized_payment, PAY-010). Extend the access window and keep
 * the role for the subscriber tied to this preapproval.
 */
export async function handleMpAuthorizedPayment(input: {
  preapprovalId: string;
  approved: boolean;
  paidAt: Date;
}): Promise<void> {
  if (!input.approved) return;
  const sub = await db.subscriber.findUnique({
    where: { mpPreapprovalId: input.preapprovalId },
  });
  if (!sub) return;
  const plan: PlanInterval = sub.plan === "year" ? "year" : "month";
  const granted = await grantRole(sub.discordId);
  await db.subscriber.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: oneTimePeriodEnd(plan, input.paidAt),
      roleGranted: granted,
      renewalRemindedAt: null,
    },
  });
}

/**
 * Customer-initiated cancel of a recurring (card) subscription (PAY-012).
 * Cancels the MP preapproval; access stays live until currentPeriodEnd, when
 * the cron expires it. Returns false when there is nothing to cancel.
 */
export async function cancelSubscriberSubscription(
  discordId: string,
): Promise<boolean> {
  const sub = await db.subscriber.findUnique({ where: { discordId } });
  if (!sub?.mpPreapprovalId) return false;
  const ok = await cancelMpPreapproval(
    sub.mpPreapprovalId,
    process.env.MP_ACCESS_TOKEN ?? "",
  );
  if (ok) {
    await db.subscriber.update({
      where: { id: sub.id },
      data: { canceledAt: new Date() },
    });
  }
  return ok;
}

/**
 * Bind a paid guest checkout to a Discord account and grant access (PAY-014).
 * The Subscriber keyed by discordId is canonical: if one already exists it is
 * updated (the new payment wins, history preserved); otherwise it is created.
 * Idempotent: a LINKED checkout returns ok without re-granting. Returns a reason
 * when it cannot proceed (unknown token, or not paid yet).
 */
export async function linkGuestCheckoutToDiscord(input: {
  token: string;
  discordId: string;
  discordUsername: string | null;
  email: string | null;
}): Promise<{ ok: boolean; reason?: "notfound" | "unpaid" }> {
  const guest = await db.guestCheckout.findUnique({
    where: { checkoutToken: input.token },
  });
  if (!guest) return { ok: false, reason: "notfound" };
  if (guest.status === "LINKED") return { ok: true };
  if (guest.status !== "PAID") return { ok: false, reason: "unpaid" };

  const plan: PlanInterval = guest.plan === "year" ? "year" : "month";
  const paidAt = guest.paidAt ?? new Date();
  const email = input.email ?? guest.email;
  const mpIds = {
    ...(guest.mpPaymentId ? { mpPaymentId: guest.mpPaymentId } : {}),
    ...(guest.mpPreapprovalId ? { mpPreapprovalId: guest.mpPreapprovalId } : {}),
  };

  const sub = await db.subscriber.upsert({
    where: { discordId: input.discordId },
    create: {
      discordId: input.discordId,
      discordUsername: input.discordUsername,
      email,
      plan: guest.plan,
      provider: "MERCADOPAGO",
      paymentMethod: guest.method,
      status: "ACTIVE",
      currentPeriodEnd: oneTimePeriodEnd(plan, paidAt),
      canceledAt: null,
      ...mpIds,
    },
    update: {
      discordUsername: input.discordUsername,
      email,
      plan: guest.plan,
      provider: "MERCADOPAGO",
      paymentMethod: guest.method,
      status: "ACTIVE",
      currentPeriodEnd: oneTimePeriodEnd(plan, paidAt),
      canceledAt: null,
      ...mpIds,
    },
  });
  const granted = await grantRole(sub.discordId);
  await db.subscriber.update({
    where: { id: sub.id },
    data: { roleGranted: granted },
  });
  await db.guestCheckout.update({
    where: { id: guest.id },
    data: { status: "LINKED", subscriberId: sub.id },
  });
  if (email) {
    await sendPaymentConfirmationEmail({ to: email, plan });
  }
  return { ok: true };
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

/**
 * Renewal reminders (PAY-018): email active Pix (one-time) subscribers whose
 * access ends within `daysBefore` days and who haven't been reminded this cycle.
 * `renewalRemindedAt` is reset to null on each new Pix payment, so a null value
 * means "not yet reminded for the current window". Returns how many were sent.
 */
export async function sendRenewalReminders(
  now: Date = new Date(),
  daysBefore = 3,
): Promise<number> {
  const windowEnd = new Date(now.getTime() + daysBefore * 86_400_000);
  const due = await db.subscriber.findMany({
    where: {
      status: "ACTIVE",
      paymentMethod: "PIX",
      renewalRemindedAt: null,
      currentPeriodEnd: { gte: now, lte: windowEnd },
    },
  });
  let sent = 0;
  for (const sub of due) {
    if (sub.email && sub.currentPeriodEnd) {
      const plan: PlanInterval = sub.plan === "year" ? "year" : "month";
      await sendRenewalReminderEmail({
        to: sub.email,
        plan,
        endsAt: sub.currentPeriodEnd,
      });
      sent++;
    }
    await db.subscriber.update({
      where: { id: sub.id },
      data: { renewalRemindedAt: now },
    });
  }
  return sent;
}
