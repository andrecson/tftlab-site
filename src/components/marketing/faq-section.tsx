import { ChevronDown } from "lucide-react";

/**
 * FAQ — ported from the old landing. Uses native <details> (accessible, no
 * client JS) with a rotating chevron; first item open by default.
 */
const FAQS = [
  {
    q: "Como funciona o acesso às aulas?",
    a: "As aulas são ao vivo, semanalmente, em horário marcado. Se você não puder comparecer, a gravação fica disponível na plataforma em até 24 horas para assistir quando quiser.",
  },
  {
    q: "Posso cancelar minha assinatura a qualquer momento?",
    a: "Sim! Você pode cancelar quando quiser, sem multas ou taxas escondidas. O acesso permanece ativo até o fim do período já pago.",
  },
  {
    q: "As tier lists são atualizadas com que frequência?",
    a: "A cada patch ou hotfix do jogo. Nossa equipe testa as mudanças imediatamente para trazer o meta mais preciso para você.",
  },
  {
    q: "O conteúdo serve para iniciantes?",
    a: "Com certeza. Temos trilhas que vão do básico (economia e tabuleiro) até estratégias avançadas de Challenger. O Lab é para todos os elos.",
  },
  {
    q: "Existe garantia de satisfação?",
    a: "Sim, garantia de 7 dias. Se não ficar satisfeito na primeira semana, devolvemos 100% do valor.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="bg-background px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Perguntas <span className="text-primary">frequentes</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
            Tire suas dúvidas sobre o funcionamento do Lab.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {FAQS.map((faq, i) => (
            <details
              key={faq.q}
              open={i === 0}
              className="group border-b border-border last:border-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-6 text-left text-lg font-bold text-foreground transition-colors hover:text-primary group-open:text-primary [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 group-open:text-primary" />
              </summary>
              <p className="pb-6 leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
