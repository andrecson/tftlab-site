import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "O TFTLab é a plataforma brasileira para evoluir no Teamfight Tactics: coaching profissional, tier lists e guias atualizados a cada patch.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeading
        title="Sobre"
        subtitle="Quem somos e o que o TFTLab entrega."
      />

      <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
        <p>
          O <span className="font-semibold text-foreground">TFTLab</span> é a sua
          plataforma para dominar o Teamfight Tactics. Reunimos{" "}
          <span className="text-primary">coaching profissional</span>, tier lists
          sempre atualizadas com o meta e guias detalhados de cada composição —
          itens, augments, posicionamento e quando/como jogar.
        </p>
        <p>
          Nosso objetivo é simples: te ajudar a jogar melhor e subir de elo, seja
          com as ferramentas grátis (tier list e builder) ou com o acompanhamento
          das aulas semanais junto a mentores internacionais.
        </p>
      </div>
    </div>
  );
}
