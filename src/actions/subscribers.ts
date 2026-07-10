"use server";

import { requireRole } from "@/auth";
import { grantRole, revokeRole } from "@/lib/discord";
import { emailConfigured, sendTestEmail } from "@/lib/email";
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

/**
 * Rename a subscriber's display name (stored in `discordUsername`). An empty
 * value clears it (falls back to "(sem nome)" in the UI). Note: a future Discord
 * re-link via a payment webhook overwrites this with the real Discord username.
 */
export async function renameSubscriber(
  id: string,
  name: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const trimmed = (name ?? "").trim();
  if (trimmed.length > 80) {
    return { ok: false, error: "Nome muito longo (máx. 80 caracteres)." };
  }
  const sub = await db.subscriber.findUnique({ where: { id } });
  if (!sub) return { ok: false, error: "Assinante não encontrado." };

  await db.subscriber.update({
    where: { id },
    data: { discordUsername: trimmed || null },
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

/** Send a test email so a curator can verify the SMTP config from the admin. */
export async function sendTestEmailAction(
  to: string,
): Promise<SubscriberActionResult> {
  await requireRole("EDITOR");
  const address = (to ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: "Email inválido." };
  }
  if (!emailConfigured()) {
    return {
      ok: false,
      error:
        "SMTP não configurado. Preencha SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM no .env.",
    };
  }
  const sent = await sendTestEmail(address);
  if (!sent) {
    return { ok: false, error: "Falha ao enviar. Confira as credenciais SMTP." };
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
