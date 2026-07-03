import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { CHECKOUT_URL } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Loja",
  description:
    "Produtos e serviços do TFTLab: coaching, mentorias e itens da loja oficial.",
  alternates: { canonical: "/loja" },
};

export default function LojaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeading
        title="Loja"
        subtitle="Coaching, mentorias e produtos oficiais do TFTLab."
      />

      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <p className="mx-auto max-w-xl text-muted-foreground">
          Nossa loja é hospedada na Hostinger, com pagamento seguro. Clique
          abaixo para ver os produtos disponíveis e finalizar a compra.
        </p>
        <a
          href={CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)] transition-opacity hover:opacity-90"
        >
          Ir para a loja
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
