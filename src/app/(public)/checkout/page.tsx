import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CheckoutClient } from "@/components/account/checkout-client";
import { isPlanInterval, type PlanInterval } from "@/lib/payments/config";

export const metadata: Metadata = {
  title: "Assinar",
  description: "Finalize sua assinatura do TFTLab.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Charged amount (whole BRL) per plan; env-overridable (mirrors /api/checkout). */
function amountBRL(plan: PlanInterval): number {
  const raw = plan === "year" ? process.env.MP_PRICE_YEAR : process.env.MP_PRICE_MONTH;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return plan === "year" ? 480 : 80;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  if (!isPlanInterval(plan)) redirect("/planos");

  const session = await auth();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <CheckoutClient
        plan={plan}
        amount={amountBRL(plan)}
        isLoggedIn={Boolean(session?.user?.discordId)}
        initialEmail={session?.user?.email ?? ""}
      />
      <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
        Pagamento processado pelo Mercado Pago. Após confirmar, seu cargo de
        assinante é liberado no Discord.
      </p>
    </div>
  );
}
