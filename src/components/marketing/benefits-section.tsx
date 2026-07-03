import {
  BookOpen,
  Calendar,
  Crown,
  Key,
  TrendingUp,
  Users,
} from "lucide-react";

/**
 * "O que você recebe" — benefits grid, ported from the old landing into our
 * tokens (cyan primary on dark). Static (no scroll-gated reveals); hover is a
 * CSS transition.
 */
const BENEFITS = [
  {
    icon: Calendar,
    title: "Aulas semanais",
    description:
      "Sessões ao vivo toda semana com Q&A em tempo real, análise de gameplay e feedback personalizado.",
  },
  {
    icon: TrendingUp,
    title: "Análise de meta exclusiva",
    description:
      "Vá além da tier list pública com análises aprofundadas do meta e das mudanças de cada patch, exclusivas para assinantes.",
  },
  {
    icon: BookOpen,
    title: "Guias completos",
    description:
      "Biblioteca de guias feitos por profissionais, cobrindo todos os aspectos do jogo.",
  },
  {
    icon: Users,
    title: "Comunidade ativa",
    description:
      "Um grupo de jogadores dedicados a evoluir, trocar estratégias e crescer juntos.",
  },
  {
    icon: Crown,
    title: "Coaching premium",
    description:
      "Metodologia usada por pro players para identificar e corrigir erros rapidamente.",
  },
  {
    icon: Key,
    title: "Acesso VIP",
    description:
      "Prioridade em eventos, campeonatos da comunidade e sorteios exclusivos para assinantes.",
  },
] as const;

export function BenefitsSection() {
  return (
    <section id="beneficios" className="bg-background px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            O que você <span className="text-primary">recebe</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Todas as ferramentas para alcançar o elo dos seus sonhos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted transition-colors group-hover:border-primary/30 group-hover:bg-primary/10">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
