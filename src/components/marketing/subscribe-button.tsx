import Link from "next/link";

import { type Plan } from "@/lib/marketing";

/**
 * Subscribe CTA for a plan (PAY-016). Sends the buyer to the on-site
 * transparent checkout (`/checkout?plan=…`), which offers Cartão (recurring) and
 * Pix (one-time) via Mercado Pago. Logged-in customers pay straight away; guests
 * pay first and link Discord afterwards. No Discord OAuth before payment.
 */
export function SubscribeButton({ plan }: { plan: Plan }) {
  const primaryBtn = plan.highlight
    ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] hover:opacity-90"
    : "border border-border text-foreground hover:border-primary/50";

  return (
    <Link
      href={`/checkout?plan=${plan.interval}`}
      className={`mt-8 inline-flex items-center justify-center rounded-lg px-6 py-4 text-sm font-bold uppercase tracking-wide transition-all ${primaryBtn}`}
    >
      Assinar plano {plan.name}
    </Link>
  );
}
