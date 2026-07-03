import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

/**
 * Closing CTA — ported from the old landing. Funnels to the plans page. A solid
 * bordered panel (no glass/gradient, per DESIGN.md) with one restrained cyan
 * glow, elevated by border + color like the rest of the system.
 */
const PERKS = ["Acesso imediato", "7 dias de garantia", "Suporte no WhatsApp"];

export function CtaSection() {
  return (
    <section className="px-4 py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-8 text-center md:p-16">
          {/* one restrained cyan glow (atmospheric, like the mentors section) */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-full max-w-lg -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

          <div className="relative">
            <span className="mb-8 inline-block rounded-full bg-primary px-4 py-1 text-sm font-bold uppercase tracking-wider text-primary-foreground">
              Vagas limitadas
            </span>

            <h2 className="mb-6 text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Pronto para{" "}
              <span className="italic text-primary">evoluir?</span>
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Não perca mais tempo tentando aprender sozinho. Junte-se a centenas
              de jogadores que já alcançaram seus objetivos com o nosso método.
            </p>

            <Link
              href="/planos"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-10 py-5 text-lg font-black uppercase tracking-wide text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)]"
            >
              Entrar no laboratório
              <ArrowRight className="h-6 w-6" />
            </Link>

            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-center gap-2">
                  <Check size={18} className="text-primary" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
