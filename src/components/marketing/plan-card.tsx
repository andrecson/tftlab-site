import { Check, Sparkles } from "lucide-react";

import { type Plan } from "@/lib/marketing";
import { SubscribeButton } from "@/components/marketing/subscribe-button";

/**
 * A subscription plan card, shared by the Home plans preview and the /planos
 * page. The "assinar" button sends the user to the Hostinger checkout
 * (CHECKOUT_URL) — the user chose to keep payment on Hostinger.
 */
export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-8 transition-all ${
        plan.highlight
          ? "z-10 border-primary bg-card shadow-[0_0_40px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.25)]"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      {plan.highlight && (
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
          Mais popular
        </span>
      )}

      <h3 className="mt-2 text-xl font-bold text-foreground">{plan.name}</h3>

      {plan.promoText && (
        <div className="mt-1 flex items-center gap-1 text-primary">
          <Sparkles size={14} className="fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest sm:text-xs">
            {plan.promoText}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-baseline gap-1">
        <span
          className={`text-4xl font-black ${
            plan.highlight ? "text-primary" : "text-foreground"
          }`}
        >
          {plan.price}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {plan.period}
        </span>
      </div>

      <p className="mt-3 min-h-[40px] text-sm text-muted-foreground">
        {plan.description}
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check
              size={18}
              className={`mt-0.5 shrink-0 ${
                plan.highlight ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span className="text-sm font-medium text-foreground/90">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <SubscribeButton plan={plan} />
    </div>
  );
}
