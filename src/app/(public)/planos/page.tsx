import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { CHECKOUT_URL } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Coaching de Teamfight Tactics: aulas semanais com mentores internacionais e acompanhamento para subir de elo.",
  alternates: { canonical: "/planos" },
};

const PLANS = [
  {
    name: "Mensal",
    price: "R$40",
    period: "/mês",
    perks: [
      "Aulas semanais em grupo",
      "Tier lists e guias atualizados",
      "Comunidade e suporte",
    ],
    highlight: false,
  },
  {
    name: "Anual",
    price: "R$80",
    period: "/ano",
    perks: [
      "Tudo do plano mensal",
      "2 meses grátis",
      "Prioridade no acompanhamento",
    ],
    highlight: true,
  },
] as const;

export default function PlanosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeading
        title="Planos"
        subtitle="Coaching pra evoluir de verdade — aulas semanais e acompanhamento."
      />

      <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-2xl border bg-card p-6 ${
              plan.highlight
                ? "border-primary/60 shadow-[0_0_24px_hsl(var(--primary)/0.15)]"
                : "border-border"
            }`}
          >
            {plan.highlight && (
              <span className="mb-3 inline-block w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                Mais popular
              </span>
            )}
            <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-black text-foreground">
                {plan.price}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">
                {plan.period}
              </span>
            </div>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary" aria-hidden="true">
                    ✓
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
            <a
              href={CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all ${
                plan.highlight
                  ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] hover:opacity-90"
                  : "border border-border text-foreground hover:border-primary/50"
              }`}
            >
              Assinar
            </a>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
        Pagamento processado pela nossa loja na Hostinger. Dúvidas? Fale com a
        gente no WhatsApp.
      </p>
    </div>
  );
}
