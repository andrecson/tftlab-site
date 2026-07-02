import { type NextRequest, NextResponse } from "next/server";

import {
  fetchStripeSubscription,
  parseStripeEvent,
  stripeStatusGrantsAccess,
  verifyStripeSignature,
} from "@/lib/payments/stripe";
import {
  activateByStripeCheckout,
  cancelStripeSubscription,
  markEventProcessed,
  syncStripeSubscription,
  unmarkEvent,
} from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook (recurring subscriptions). Verifies the signature over the RAW
 * body, dedupes by event id, then grants/syncs/revokes the Discord role.
 * Endpoint to register in Stripe: https://<site>/api/webhooks/stripe
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  const event = parseStripeEvent(raw);
  if (!event) return new NextResponse("bad payload", { status: 400 });

  // Claim the event; a duplicate delivery short-circuits.
  if (!(await markEventProcessed("STRIPE", event.id))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const obj = event.data.object;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const subscriberId =
          typeof obj.client_reference_id === "string" ? obj.client_reference_id : null;
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;
        const customerId = typeof obj.customer === "string" ? obj.customer : null;
        if (subscriberId && subscriptionId) {
          const subObj = await fetchStripeSubscription(subscriptionId, secretKey);
          if (subObj) {
            await activateByStripeCheckout({
              subscriberId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(subObj.current_period_end * 1000),
            });
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const id = typeof obj.id === "string" ? obj.id : null;
        const status = typeof obj.status === "string" ? obj.status : "";
        const cpe = typeof obj.current_period_end === "number" ? obj.current_period_end : null;
        if (id && cpe) {
          await syncStripeSubscription({
            stripeSubscriptionId: id,
            grantsAccess: stripeStatusGrantsAccess(status),
            currentPeriodEnd: new Date(cpe * 1000),
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const id = typeof obj.id === "string" ? obj.id : null;
        if (id) await cancelStripeSubscription(id);
        break;
      }
      case "invoice.paid": {
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;
        if (subscriptionId) {
          const subObj = await fetchStripeSubscription(subscriptionId, secretKey);
          if (subObj) {
            await syncStripeSubscription({
              stripeSubscriptionId: subscriptionId,
              grantsAccess: stripeStatusGrantsAccess(subObj.status),
              currentPeriodEnd: new Date(subObj.current_period_end * 1000),
            });
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook]", err);
    await unmarkEvent("STRIPE", event.id); // let Stripe retry
    return new NextResponse("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
