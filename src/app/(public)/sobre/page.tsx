import type { Metadata } from "next";
import Link from "next/link";
import { Target, Trophy, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça o TFTLab: nossa missão, comunidade e o compromisso de ajudar jogadores a dominar o Teamfight Tactics com coaching profissional e ferramentas grátis.",
  alternates: { canonical: "/sobre" },
};

const VALUES = [
  {
    icon: Target,
    title: "Nossa missão",
    description:
      "Oferecer educação de TFT de classe mundial e ajudar jogadores de todos os níveis a alcançar seu potencial máximo com orientação especializada.",
  },
  {
    icon: Users,
    title: "Nossa comunidade",
    description:
      "Uma comunidade ativa de jogadores apaixonados aprendendo juntos, trocando estratégias e apoiando o crescimento uns dos outros.",
  },
  {
    icon: Trophy,
    title: "Excelência",
    description:
      "Apoiado por profissionais internacionais e jogadores de alto nível que trazem estratégias comprovadas e anos de experiência competitiva.",
  },
] as const;

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Intro */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
          Sobre o <span className="text-primary">TFTLab</span>
        </h1>
        <p className="mx-auto mt-5 text-lg leading-relaxed text-muted-foreground">
          Ajudamos jogadores de TFT a alcançar a maestria através de coaching
          profissional, recursos completos e uma comunidade de apoio — além de
          ferramentas grátis (tier list e builder) para dominar o meta.
        </p>
      </div>

      {/* Values */}
      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        {VALUES.map((value) => {
          const Icon = value.icon;
          return (
            <div
              key={value.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/50"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-muted transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                <Icon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-3 text-xl font-bold text-foreground">
                {value.title}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Why us */}
      <div className="mt-16 rounded-2xl border border-primary/20 bg-card/60 p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          Por que nos escolher?
        </h2>
        <p className="mx-auto mt-6 max-w-4xl text-lg leading-relaxed text-muted-foreground">
          Combinamos experiência profissional com atenção personalizada. Nossos
          mentores internacionais competiram nos níveis mais altos e, com aulas
          ao vivo semanais e conteúdo sempre atualizado, entregamos tudo o que
          você precisa para elevar o seu jogo.
        </p>
        <Link
          href="/planos"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90"
        >
          Conhecer os planos
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
