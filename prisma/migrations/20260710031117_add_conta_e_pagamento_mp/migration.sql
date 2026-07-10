-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD', 'PIX_AUTOMATICO');

-- CreateEnum
CREATE TYPE "GuestCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'LINKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "mpPreapprovalId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "renewalRemindedAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuestCheckout" (
    "id" TEXT NOT NULL,
    "checkoutToken" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "GuestCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "email" TEXT,
    "amountBRL" INTEGER,
    "mpPaymentId" TEXT,
    "mpPreapprovalId" TEXT,
    "paidAt" TIMESTAMP(3),
    "subscriberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_mpPreapprovalId_key" ON "Subscriber"("mpPreapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCheckout_checkoutToken_key" ON "GuestCheckout"("checkoutToken");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCheckout_mpPaymentId_key" ON "GuestCheckout"("mpPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestCheckout_mpPreapprovalId_key" ON "GuestCheckout"("mpPreapprovalId");

-- CreateIndex
CREATE INDEX "GuestCheckout_status_idx" ON "GuestCheckout"("status");
