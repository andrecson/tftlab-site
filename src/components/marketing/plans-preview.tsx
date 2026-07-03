import { PLANS } from "@/lib/marketing";
import { PaymentTrust } from "@/components/marketing/payment-trust";
import { PlanCard } from "@/components/marketing/plan-card";

/**
 * "Escolha seu plano" — the plans preview on the landing. Shares PlanCard +
 * PLANS with the /planos page so pricing stays in sync.
 */
export function PlansPreview() {
  return (
    <section id="planos" className="bg-background px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Escolha seu <span className="text-primary">plano</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Invista no seu conhecimento e comece a subir de elo hoje mesmo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <PaymentTrust />
      </div>
    </section>
  );
}
