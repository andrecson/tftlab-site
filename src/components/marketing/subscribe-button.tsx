"use client";

import { useState } from "react";

import { MP_LINKS, STRIPE_LINKS, WHATSAPP_URL, type Plan } from "@/lib/marketing";

/**
 * Subscribe CTA for a plan. Both payment methods are hosted Payment Links —
 * Mercado Pago (mpago.la, Pix/boleto/cartão) and Stripe (buy.stripe.com, cartão).
 * The site just links out; the bot grants the Discord role via each provider's
 * webhook. Falls back to WhatsApp if no link is configured.
 */
export function SubscribeButton({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);

  const mpLink = MP_LINKS[plan.interval];
  const stripeLink = STRIPE_LINKS[plan.interval];

  const primaryBtn = plan.highlight
    ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] hover:opacity-90"
    : "border border-border text-foreground hover:border-primary/50";

  // Nothing configured → keep the WhatsApp fallback.
  if (!mpLink && !stripeLink) {
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

  // Checkout goes through Discord OAuth first (/api/discord/login) so the
  // payment can be attributed to the buyer's Discord account and the webhook
  // can grant the subscriber role. Same-tab navigation (cookie-based state).
  return (
    <div className="mt-8 space-y-2">
      {mpLink && (
        <a
          href={`/api/discord/login?provider=mp&plan=${plan.interval}`}
          className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90"
        >
          Pix · boleto · cartão
        </a>
      )}
      {stripeLink && (
        <a
          href={`/api/discord/login?provider=stripe&plan=${plan.interval}`}
          className="flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-bold uppercase tracking-wide text-foreground transition-colors hover:border-primary/50"
        >
          Cartão de crédito
        </a>
      )}
      <p className="text-[11px] text-muted-foreground">
        Você vincula o Discord e faz o pagamento; o cargo de assinante é liberado
        assim que a compra é confirmada.
      </p>
    </div>
  );
}
