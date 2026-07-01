import type { Metadata } from "next";
import Link from "next/link";

import { Hero } from "@/components/marketing/hero";

/**
 * Landing / home (`/`) — the coaching front door ported from the old
 * tftlab.com.br, now the single site's entry point. The tier list moved to
 * `/tier-list`. More landing sections (benefits, mentors, testimonials, plans
 * preview, FAQ) are being ported in incrementally.
 */
export const metadata: Metadata = {
  title: "TFTLab — Coaching, tier lists e guias de Teamfight Tactics",
  description:
    "Evolua no Teamfight Tactics com coaching profissional, tier lists atualizadas do patch e guias de especialistas. Aulas semanais e ferramentas grátis (tier list + builder).",
  alternates: { canonical: "/" },
};

const EXPLORE = [
  {
    href: "/tier-list",
    title: "Tier List",
    desc: "As comps mais fortes do patch, ranqueadas por tier — com carries, itens e augments.",
    cta: "Ver tier list",
  },
  {
    href: "/builder",
    title: "Builder",
    desc: "Monte seu board hexágono a hexágono, defina estrelas e itens, e compartilhe por link.",
    cta: "Abrir builder",
  },
  {
    href: "/planos",
    title: "Coaching",
    desc: "Aulas semanais com mentores internacionais e acompanhamento para subir de elo.",
    cta: "Ver planos",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
          Explore o <span className="text-primary">Lab</span>
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Ferramentas grátis pra dominar o meta + coaching pra evoluir de verdade.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {EXPLORE.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
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
      </section>
    </>
  );
}
