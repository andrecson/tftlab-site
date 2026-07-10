import { type NextRequest, NextResponse } from "next/server";

import {
  expireLapsedSubscribers,
  sendRenewalReminders,
} from "@/server/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Backstop that expires ACTIVE subscribers whose access window has passed and
 * revokes their Discord role — needed for Mercado Pago (one-time, no renewal
 * webhook), and a safety net for Stripe. Protect with CRON_SECRET; Vercel Cron
 * sends `Authorization: Bearer <CRON_SECRET>` automatically. Suggested: hourly.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const expired = await expireLapsedSubscribers();
  const reminded = await sendRenewalReminders();
  return NextResponse.json({ expired, reminded });
}

export const GET = handle;
export const POST = handle;
