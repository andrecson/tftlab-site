"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { PaymentProvider, SubscriberStatus } from "@prisma/client";

import {
  deleteSubscriber,
  grantByDiscordId,
  grantSubscriber,
  renameSubscriber,
  revokeSubscriber,
  sendTestEmailAction,
  setSubscriberExpiry,
  type SubscriberActionResult,
} from "@/actions/subscribers";
import type { AdminSubscriber } from "@/server/queries/subscribers";

/**
 * Curator panel to manage the Discord subscriber role. Renders straight from the
 * server props and calls `router.refresh()` after each action (the admin shell
 * is force-dynamic), so the list always reflects the DB without optimistic drift.
 */
const STATUS_META: Record<SubscriberStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Ativo", className: "bg-emerald-500/15 text-emerald-400" },
  PENDING: { label: "Aguardando", className: "bg-muted text-muted-foreground" },
  EXPIRED: {
    label: "Expirado",
    className: "bg-secondary/40 text-secondary-foreground",
  },
  CANCELED: { label: "Cancelado", className: "bg-destructive/15 text-destructive" },
};
const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  STRIPE: "Stripe",
  MERCADOPAGO: "Mercado Pago",
};
const PLAN_LABEL: Record<string, string> = { month: "Mensal", year: "Anual" };
const STATUSES: SubscriberStatus[] = ["ACTIVE", "PENDING", "EXPIRED", "CANCELED"];

const inputClass =
  "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

/** Stable pt-BR DD/MM/YYYY (UTC parts, no locale/timezone drift on hydration). */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

/**
 * Human-friendly pt-BR elapsed time from `fromIso` to `nowIso` (e.g. "3 meses",
 * "1 ano e 2 meses"). `nowIso` is a fixed server timestamp so the string is
 * identical on the server render and after hydration (no mismatch).
 */
function formatTenure(fromIso: string, nowIso: string): string {
  const from = new Date(fromIso).getTime();
  const now = new Date(nowIso).getTime();
  const days = Math.max(0, Math.floor((now - from) / 86_400_000));
  if (days < 1) return "hoje";
  if (days === 1) return "1 dia";
  if (days < 45) return `${days} dias`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(days / 365.25);
  const remMonths = Math.round((days - years * 365.25) / 30.44);
  const y = `${years} ${years === 1 ? "ano" : "anos"}`;
  return remMonths <= 0
    ? y
    : `${y} e ${remMonths} ${remMonths === 1 ? "mês" : "meses"}`;
}

export function SubscribersManager({
  subscribers,
  now,
}: {
  subscribers: AdminSubscriber[];
  now: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriberStatus | "">("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Manual-comp form.
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newPlan, setNewPlan] = useState("month");
  // SMTP test form.
  const [testEmail, setTestEmail] = useState("");
  // Inline name editing.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.discordId.includes(q) ||
        (s.discordUsername ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [subscribers, query, statusFilter]);

  async function run(
    key: string,
    action: () => Promise<SubscriberActionResult>,
    okMessage: string,
  ) {
    setPending(key);
    setError(null);
    setNotice(null);
    const result = await action();
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(okMessage);
    router.refresh();
  }

  function startEdit(s: AdminSubscriber) {
    setEditingId(s.id);
    setEditValue(s.discordUsername ?? "");
    setError(null);
    setNotice(null);
  }

  function saveEdit(id: string) {
    const name = editValue;
    void run(id, () => renameSubscriber(id, name), "Nome atualizado.").then(() =>
      setEditingId(null),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Manual comp */}
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/40 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const id = newDiscordId;
          void run("manual", () => grantByDiscordId(id, newPlan), "Cargo concedido.").then(
            () => setNewDiscordId(""),
          );
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Liberar por Discord ID
          </label>
          <input
            value={newDiscordId}
            onChange={(e) => setNewDiscordId(e.target.value)}
            inputMode="numeric"
            placeholder="ex.: 000000000000000000"
            aria-label="Discord ID"
            className={`w-56 ${inputClass} placeholder:text-muted-foreground`}
          />
        </div>
        <select
          value={newPlan}
          onChange={(e) => setNewPlan(e.target.value)}
          aria-label="Plano"
          className={inputClass}
        >
          <option value="month">Mensal</option>
          <option value="year">Anual</option>
        </select>
        <button
          type="submit"
          disabled={pending !== null || !newDiscordId.trim()}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "manual" ? "Concedendo…" : "Conceder cargo"}
        </button>
        <p className="basis-full text-xs text-muted-foreground">
          O membro precisa já estar no servidor do Discord. Isso concede o cargo e
          registra a assinatura.
        </p>
      </form>

      {/* SMTP test */}
      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card/40 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            "test-email",
            () => sendTestEmailAction(testEmail),
            "Email de teste enviado.",
          );
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Testar SMTP (enviar email de teste)
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="seu@email.com"
            aria-label="Email para teste"
            className={`w-56 ${inputClass} placeholder:text-muted-foreground`}
          />
        </div>
        <button
          type="submit"
          disabled={pending !== null || !testEmail.trim()}
          className="rounded-md border border-border px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === "test-email" ? "Enviando…" : "Enviar teste"}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por Discord, usuário ou email…"
          aria-label="Buscar assinante"
          className={`w-full max-w-sm ${inputClass} placeholder:text-muted-foreground`}
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as SubscriberStatus | "")
          }
          aria-label="Filtrar por status"
          className={inputClass}
        >
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} de {subscribers.length}
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {subscribers.length === 0
            ? "Nenhum assinante ainda. Quando alguém assinar (ou você liberar acima), aparece aqui."
            : "Nenhum assinante encontrado."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => {
            const status = STATUS_META[s.status];
            const busy = pending === s.id;
            const active = s.status === "ACTIVE" || s.roleGranted;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-border bg-card p-3"
              >
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  {editingId === s.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit(s.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        maxLength={80}
                        placeholder="Nome do assinante"
                        aria-label={`Nome de ${s.discordId}`}
                        className={`w-48 ${inputClass} placeholder:text-muted-foreground`}
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(s.id)}
                        disabled={pending !== null}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className="truncate">
                        {s.discordUsername || "(sem nome)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        aria-label={`Editar nome de ${s.discordId}`}
                        title="Editar nome"
                        className="shrink-0 text-muted-foreground/60 transition-colors hover:text-primary"
                      >
                        <Pencil size={13} aria-hidden />
                      </button>
                      <span className="ml-1 truncate font-mono text-xs text-muted-foreground/70">
                        {s.discordId}
                      </span>
                    </p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {s.email || "sem email"} · {PLAN_LABEL[s.plan] ?? s.plan}
                    {s.provider ? ` · ${PROVIDER_LABEL[s.provider]}` : " · manual"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                    {s.status === "ACTIVE"
                      ? `Ativo há ${formatTenure(s.createdAt, now)}`
                      : `Assinante desde ${fmtDate(s.createdAt)}`}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium ${
                    s.roleGranted
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.roleGranted ? "Com cargo" : "Sem cargo"}
                </span>

                {/* Expiry */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    type="date"
                    defaultValue={s.currentPeriodEnd?.slice(0, 10) ?? ""}
                    aria-label={`Vencimento de ${s.discordId}`}
                    className={`${inputClass} py-1`}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value)
                        void run(
                          s.id,
                          () =>
                            setSubscriberExpiry(
                              s.id,
                              new Date(value + "T12:00:00Z").toISOString(),
                            ),
                          "Vencimento atualizado.",
                        );
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {busy ? (
                    <span role="status" className="text-xs text-muted-foreground">
                      Salvando…
                    </span>
                  ) : null}
                  {active ? (
                    <button
                      type="button"
                      onClick={() =>
                        void run(
                          s.id,
                          () => revokeSubscriber(s.id),
                          "Cargo revogado.",
                        )
                      }
                      disabled={pending !== null}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Revogar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void run(
                          s.id,
                          () => grantSubscriber(s.id),
                          "Cargo concedido.",
                        )
                      }
                      disabled={pending !== null}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Conceder
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remover o assinante ${s.discordUsername || s.discordId}? Isso revoga o cargo e apaga o registro.`,
                        )
                      )
                        void run(
                          s.id,
                          () => deleteSubscriber(s.id),
                          "Assinante removido.",
                        );
                    }}
                    disabled={pending !== null}
                    aria-label={`Remover ${s.discordId}`}
                    className="rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
