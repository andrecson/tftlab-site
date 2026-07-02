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

/** Messages for the ?erro= codes the checkout/OAuth routes redirect back with. */
const CHECKOUT_ERRORS: Record<string, string> = {
  indisponivel: "O checkout por assinatura ainda não está configurado. Fale com a gente no WhatsApp.",
  parametros: "Plano ou forma de pagamento inválidos. Tente novamente.",
  vinculo: "Não deu pra confirmar o vínculo com o Discord. Comece de novo.",
  discord: "Falha ao conectar com o Discord. Tente novamente em instantes.",
};

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const errorMessage = erro ? CHECKOUT_ERRORS[erro] : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeading
        title="Planos"
        subtitle="Aulas semanais ao vivo, guias exclusivos e comunidade — pra evoluir de verdade."
      />

      {errorMessage && (
        <p
          role="alert"
          className="mx-auto mt-6 max-w-3xl rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}

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
