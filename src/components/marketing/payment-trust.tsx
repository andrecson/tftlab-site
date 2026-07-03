import { ShieldCheck } from "lucide-react";

/**
 * Trust line for the plans area: checkout is handled by Stripe / Mercado Pago,
 * so the site never touches card data. Restrained (icon + one line), shared by
 * the home plans preview and the /planos page for a consistent signal.
 */
export function PaymentTrust() {
  return (
    <p className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      Pagamento processado com segurança pela Stripe ou pelo Mercado Pago.
    </p>
  );
}
