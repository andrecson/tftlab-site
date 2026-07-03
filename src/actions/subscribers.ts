"use server";

import { requireRole } from "@/auth";
import { grantRole, revokeRole } from "@/lib/discord";
import { isPlanInterval, oneTimePeriodEnd } from "@/lib/payments/config";
import { db } from "@/server/db";

export type SubscriberActionResult = { ok: true } | { ok: false; error: string };

/** Try to grant the Discord role; never throws (returns false on any failure). */
async function tryGrant(discordId: string): Promise<boolean> {
  try {
    return await grantRole(discordId);
  } catch {
    return false;
  }
}

async function tryRevoke(discordId: string): Promise<void> {
  try {
    await revokeRole(discordId);
  } catch {
    // Best-effort; the DB state is still updated below.
  }
}

/**
 * Grant / re-grant the subscriber role to an existing subscriber (e.g. comp a
 * member, or fix a webhook that failed). Marks ACTIVE and ensures a future
 * access window (extends by the plan's duration when missing/past).
 */
export async function grantSubscriber(
  id: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const sub = await db.subscriber.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "Assinante não encontrado." };

  const granted = await tryGrant(sub.discordId);
  const plan = sub.plan === "year" ? "year" : "month";
  const now = new Date();
  const end =
    sub.currentPeriodEnd && sub.currentPeriodEnd > now
      ? sub.currentPeriodEnd
      : oneTimePeriodEnd(plan, now);

  await db.subscriber.update({
    where: { id },
    data: { status: "ACTIVE", roleGranted: granted, currentPeriodEnd: end },
  });

  if (!granted) {
    return {
      ok: false,
      error:
        "Status salvo, mas o cargo no Discord não foi concedido. Confira as chaves do Discord e se o usuário está no servidor.",
    };
  }
  return { ok: true };
}

/** Revoke the subscriber role and mark the subscriber CANCELED. */
export async function revokeSubscriber(
  id: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const sub = await db.subscriber.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "Assinante não encontrado." };

  await tryRevoke(sub.discordId);
  await db.subscriber.update({
    where: { id },
    data: { status: "CANCELED", roleGranted: false },
  });
  return { ok: true };
}

/** Set the access window end (extend / shorten a subscription by date). */
export async function setSubscriberExpiry(
  id: string,
  isoDate: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Data inválida." };
  }
  const sub = await db.subscriber.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "Assinante não encontrado." };

  await db.subscriber.update({
    where: { id },
    data: { currentPeriodEnd: date },
  });
  return { ok: true };
}

/**
 * Comp a member manually by Discord ID: create/refresh the subscriber ACTIVE
 * and grant the role (works if the user is already in the server). Provider is
 * left null (not a real payment).
 */
export async function grantByDiscordId(
  discordId: string,
  plan: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const id = (discordId ?? "").trim();
  if (!/^\d{5,25}$/.test(id)) {
    return { ok: false, error: "Discord ID inválido (apenas números)." };
  }
  const interval = isPlanInterval(plan) ? plan : "month";
  const granted = await tryGrant(id);
  const end = oneTimePeriodEnd(interval, new Date());

  await db.subscriber.upsert({
    where: { discordId: id },
    create: {
      discordId: id,
      plan: interval,
      status: "ACTIVE",
      roleGranted: granted,
      currentPeriodEnd: end,
    },
    update: {
      plan: interval,
      status: "ACTIVE",
      roleGranted: granted,
      currentPeriodEnd: end,
    },
  });

  if (!granted) {
    return {
      ok: false,
      error:
        "Assinante salvo, mas o cargo não foi concedido. Confira as chaves do Discord e se o usuário está no servidor.",
    };
  }
  return { ok: true };
}

/** Remove a subscriber entirely (revokes the role first). */
export async function deleteSubscriber(
  id: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const sub = await db.subscriber.findUnique({ where: { id } });
  if (sub) await tryRevoke(sub.discordId);
  await db.subscriber.delete({ where: { id } }).catch(() => undefined);
  return { ok: true };
}
