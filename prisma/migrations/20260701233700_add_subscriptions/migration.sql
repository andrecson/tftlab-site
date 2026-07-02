-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MERCADOPAGO');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT,
    "email" TEXT,
    "plan" TEXT NOT NULL,
    "provider" "PaymentProvider",
    "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "currentPeriodEnd" TIMESTAMP(3),
    "roleGranted" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "mpPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_discordId_key" ON "Subscriber"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_stripeCustomerId_key" ON "Subscriber"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_stripeSubscriptionId_key" ON "Subscriber"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_mpPaymentId_key" ON "Subscriber"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Subscriber_status_currentPeriodEnd_idx" ON "Subscriber"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "Subscriber_email_idx" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

