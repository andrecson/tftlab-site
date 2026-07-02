/**
 * Payment plan constants shared by the checkout redirect + the webhooks.
 * Pure + secret-free so it can be unit-tested and imported anywhere.
 */

/** Plan intervals the site sells (mirrors the `interval` in src/lib/marketing). */
export type PlanInterval = "month" | "year";

/** Which hosted-checkout provider a "Assinar" click routes to. */
export type ProviderSlug = "stripe" | "mp";

export function isPlanInterval(value: unknown): value is PlanInterval {
  return value === "month" || value === "year";
}

export function isProviderSlug(value: unknown): value is ProviderSlug {
  return value === "stripe" || value === "mp";
}

/**
 * Access window (in days) granted by a ONE-TIME payment (Mercado Pago), which
 * has no renewal webhook — the cron route revokes the role once this elapses.
 * Slightly padded so a payment that lands late in the day still gets a full
 * period. Stripe (recurring) ignores this and uses the subscription's real
 * `current_period_end` instead.
 */
export const PLAN_DURATION_DAYS: Record<PlanInterval, number> = {
  month: 31,
  year: 366,
};

/** paidAt + the plan's one-time duration → when access should end. */
export function oneTimePeriodEnd(plan: PlanInterval, paidAt: Date): Date {
  const end = new Date(paidAt.getTime());
  end.setUTCDate(end.getUTCDate() + PLAN_DURATION_DAYS[plan]);
  return end;
}
