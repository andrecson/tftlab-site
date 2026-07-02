"use client";

import { useState } from "react";

import { BOT_URL, STRIPE_LINKS, WHATSAPP_URL, type Plan } from "@/lib/marketing";

/**
 * Subscribe CTA for a plan. Offers both payment methods (user chose MP + Stripe):
 * - Mercado Pago: collects an e-mail, POSTs to the bot's
 *   `/api/mercadopago/preferences/create`, then redirects to the MP checkout.
 * - Stripe: a Payment Link per plan interval.
 * Both env vars are set at build time; while unset it falls back to WhatsApp.
 */
export function SubscribeButton({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeLink = STRIPE_LINKS[plan.interval];
  const hasMP = BOT_URL.length > 0;
  const hasStripe = stripeLink.length > 0;

  const primaryBtn = plan.highlight
    ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] hover:opacity-90"
    : "border border-border text-foreground hover:border-primary/50";

  // Nothing configured yet → keep the WhatsApp fallback.
  if (!hasMP && !hasStripe) {
    return (
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-8 inline-flex items-center justify-center rounded-lg px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${primaryBtn}`}
      >
        Assinar plano {plan.name}
      </a>
    );
  }

  async function payWithMercadoPago() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Informe um e-mail válido.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BOT_URL}/api/mercadopago/preferences/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planInterval: plan.interval, email }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = (await res.json()) as {
        init_point?: string;
        sandbox_init_point?: string;
      };
      const url = data.init_point ?? data.sandbox_init_point;
      if (!url) throw new Error("no init_point");
      window.location.href = url;
    } catch {
      setLoading(false);
      setError("Não foi possível iniciar o pagamento. Tente de novo ou fale no WhatsApp.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-8 inline-flex items-center justify-center rounded-lg px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${primaryBtn}`}
      >
        Assinar plano {plan.name}
      </button>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {hasStripe && (
        <a
          href={stripeLink}
          className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
        >
          Pagar com cartão
        </a>
      )}

      {hasMP && (
        <div className="space-y-2">
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={payWithMercadoPago}
            disabled={loading}
            className="w-full rounded-lg border border-border px-6 py-3 text-sm font-bold uppercase tracking-wide text-foreground transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Abrindo…" : "Pix · boleto · cartão"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Via Mercado Pago. Após pagar, você vincula o Discord e recebe o cargo.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
