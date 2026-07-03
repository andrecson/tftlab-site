import type { PaymentProvider, SubscriberStatus } from "@prisma/client";

import { db } from "@/server/db";

/**
 * A subscriber row for the admin panel. Dates are serialized to ISO strings so
 * the whole array can be handed to the `"use client"` manager as props.
 */
export interface AdminSubscriber {
  id: string;
  discordId: string;
  discordUsername: string | null;
  email: string | null;
  plan: string;
  provider: PaymentProvider | null;
  status: SubscriberStatus;
  currentPeriodEnd: string | null;
  roleGranted: boolean;
  createdAt: string;
}

/** Display order: active first, then awaiting payment, then lapsed/canceled. */
const STATUS_ORDER: Record<SubscriberStatus, number> = {
  ACTIVE: 0,
  PENDING: 1,
  EXPIRED: 2,
  CANCELED: 3,
};

/**
 * Every subscriber (who linked Discord for a subscription), for the curator
 * panel. NOT `unstable_cache`'d — the admin shell is force-dynamic.
 */
export async function getSubscribers(): Promise<AdminSubscriber[]> {
  const rows = await db.subscriber.findMany({ orderBy: { updatedAt: "desc" } });
  return rows
    .map((r) => ({
      id: r.id,
      discordId: r.discordId,
      discordUsername: r.discordUsername,
      email: r.email,
      plan: r.plan,
      provider: r.provider,
      status: r.status,
      currentPeriodEnd: r.currentPeriodEnd
        ? r.currentPeriodEnd.toISOString()
        : null,
      roleGranted: r.roleGranted,
      createdAt: r.createdAt.toISOString(),
    }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}
