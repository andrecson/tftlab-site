import type { Metadata } from "next";
import Link from "next/link";

import { BenefitsSection } from "@/components/marketing/benefits-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { Hero } from "@/components/marketing/hero";
import { MentorsSection } from "@/components/marketing/mentors-section";
import { PlansPreview } from "@/components/marketing/plans-preview";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

/**
 * Landing / home (`/`) — the coaching front door ported from the old
 * tftlab.com.br, now the single site's entry point (the tier list moved to
 * `/tier-list`). A tools teaser surfaces the free tier list + builder right
 * after the hero, then the full coaching landing.
 */
export const metadata: Metadata = {
  title: "Coaching, tier lists e guias de Teamfight Tactics",
  description:
    "Evolua no Teamfight Tactics com coaching profissional, tier lists atualizadas do patch e guias de especialistas. Aulas semanais e ferramentas grátis (tier list + builder).",
  alternates: { canonical: "/" },
};

const TOOLS = [
  {
    href: "/tier-list",
    title: "Tier List",
    desc: "As comps mais fortes do patch, ranqueadas por tier, com carries, itens e augments.",
    cta: "Ver tier list",
  },
  {
    href: "/builder",
    title: "Builder",
    desc: "Monte seu board hexágono a hexágono, defina estrelas e itens, e compartilhe por link.",
    cta: "Abrir builder",
  },
  {
    href: "/tier-list",
    title: "Guias rápidos",
    desc: "O passo a passo de cada comp: quando jogar, carries, itens, augments e posicionamento no board.",
    cta: "Ver guias",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Free tools — surfaces the merged tier list + builder up front. */}
      <section id="ferramentas" className="bg-background px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Ferramentas <span className="text-primary">grátis</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
              Domine o meta antes mesmo de assinar. Tier list, guias e builder liberados.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
            {TOOLS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <h3 className="text-lg font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {item.cta}
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <BenefitsSection />
      <MentorsSection />
      <TestimonialsSection />
      <PlansPreview />
      <FaqSection />
      <CtaSection />
    </>
  );
}
