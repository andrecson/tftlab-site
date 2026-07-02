import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { PLANS } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Coaching de Teamfight Tactics: aulas semanais ao vivo, tier lists e guias atualizados, comunidade e acompanhamento para subir de elo.",
  alternates: { canonical: "/planos" },
};

export default function PlanosPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeading
        title="Planos"
        subtitle="Aulas semanais ao vivo, guias exclusivos e comunidade — pra evoluir de verdade."
      />

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
        Pagamento seguro via Mercado Pago (Pix, boleto ou cartão) ou Stripe
        (cartão). Após confirmar, você vincula seu Discord e recebe o cargo de
        assinante. Dúvidas? Fale com a gente no WhatsApp.
      </p>
    </div>
  );
}
