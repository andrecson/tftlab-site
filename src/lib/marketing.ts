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
