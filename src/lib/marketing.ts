/**
 * Shared marketing constants for the merged site (landing / plans / footer),
 * carried over from the old tftlab.com.br (Hostinger Horizons) site.
 */

/** WhatsApp contact (business line), used by the floating button + footer. */
export const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=551151783955&text&type=phone_number&app_absent=0";

/** Social profiles shown in the footer (`#` = not set up yet). */
export const SOCIAL_LINKS = {
  x: "https://x.com/TFTLab_br",
  whatsapp: WHATSAPP_URL,
  youtube: "#",
  instagram: "#",
} as const;

/**
 * Where the "assinar / comprar" buttons send the user. The user chose to keep
 * checkout on Hostinger, so this points at the Hostinger store/checkout.
 * TODO(bruno): trocar pela URL real do checkout/loja da Hostinger — por ora
 * cai no WhatsApp (contato pra assinar).
 */
export const CHECKOUT_URL = WHATSAPP_URL;

/**
 * Payment Links per plan interval. Both Stripe (buy.stripe.com) and Mercado Pago
 * (mpago.la) are hosted checkout links — the site just points to them; the bot
 * grants the Discord role via each provider's webhook. These are public URLs
 * (safe to ship); env vars override the defaults per environment.
 */
export const STRIPE_LINKS: Record<"month" | "year", string> = {
  month:
    process.env.NEXT_PUBLIC_STRIPE_LINK_MONTH ??
    "https://buy.stripe.com/00wcN5ddZgwg7EC7vIbV604",
  year:
    process.env.NEXT_PUBLIC_STRIPE_LINK_YEAR ??
    "https://buy.stripe.com/00w9ATgqb5RCaQO5nAbV605",
};

export const MP_LINKS: Record<"month" | "year", string> = {
  month: process.env.NEXT_PUBLIC_MP_LINK_MONTH ?? "https://mpago.la/1QskXFd",
  year: process.env.NEXT_PUBLIC_MP_LINK_YEAR ?? "https://mpago.la/1S7kA2Q",
};

/** A subscription plan (shared by the Home preview + the /planos page). */
export interface Plan {
  id: string;
  /** Maps to the bot's plan interval (Stripe `recurring.interval` / MP plan). */
  interval: "month" | "year";
  name: string;
  price: string;
  period: string;
  description: string;
  promoText?: string;
  features: string[];
  highlight: boolean;
}

/** Real plans carried over from the old site (MENSAL R$80/mês, ANUAL R$40/mês). */
export const PLANS: Plan[] = [
  {
    id: "monthly",
    interval: "month",
    name: "Mensal",
    price: "R$80,00",
    period: "/mês",
    description: "Para quem quer experimentar a plataforma e evoluir agora.",
    features: [
      "Acesso a todas as aulas ao vivo",
      "Análise de meta exclusiva",
      "Guias avançados exclusivos",
      "Comunidade no Discord",
      "Gravações das aulas passadas",
    ],
    highlight: false,
  },
  {
    id: "annual",
    interval: "year",
    name: "Anual",
    price: "R$40,00",
    period: "/mês",
    description: "Para o estrategista que pensa no longo prazo.",
    promoText: "Preço promocional de lançamento",
    features: [
      "Acesso a todas as aulas ao vivo",
      "Análise de meta exclusiva",
      "Guias avançados exclusivos",
      "Comunidade no Discord",
      "Gravações das aulas passadas",
      "Sorteios e promoções exclusivas",
    ],
    highlight: true,
  },
];
