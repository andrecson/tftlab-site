-- CreateEnum
CREATE TYPE "UnitRole" AS ENUM ('EARLY', 'CORE', 'FLEX');

-- CreateTable
CREATE TABLE "CompTrait" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "traitId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompUnit" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "championId" TEXT NOT NULL,
    "role" "UnitRole" NOT NULL,
    "isCarry" BOOLEAN NOT NULL DEFAULT false,
    "carryOrder" INTEGER,
    "starLevel" INTEGER,
    "boardRow" INTEGER,
    "boardCol" INTEGER,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompUnitItem" (
    "id" TEXT NOT NULL,
    "compUnitId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompUnitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompItemPriority" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompItemPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompAugment" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "augmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompAugment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompTierSnapshot" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,

    CONSTRAINT "CompTierSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompTrait_traitId_idx" ON "CompTrait"("traitId");

-- CreateIndex
CREATE UNIQUE INDEX "CompTrait_compId_traitId_key" ON "CompTrait"("compId", "traitId");

-- CreateIndex
CREATE INDEX "CompUnit_compId_idx" ON "CompUnit"("compId");

-- CreateIndex
CREATE INDEX "CompUnit_championId_idx" ON "CompUnit"("championId");

-- CreateIndex
CREATE UNIQUE INDEX "CompUnit_compId_boardRow_boardCol_key" ON "CompUnit"("compId", "boardRow", "boardCol");

-- CreateIndex
CREATE INDEX "CompUnitItem_compUnitId_idx" ON "CompUnitItem"("compUnitId");

-- CreateIndex
CREATE INDEX "CompUnitItem_itemId_idx" ON "CompUnitItem"("itemId");

-- CreateIndex
CREATE INDEX "CompItemPriority_compId_idx" ON "CompItemPriority"("compId");

-- CreateIndex
CREATE INDEX "CompItemPriority_itemId_idx" ON "CompItemPriority"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CompItemPriority_compId_itemId_key" ON "CompItemPriority"("compId", "itemId");

-- CreateIndex
CREATE INDEX "CompAugment_compId_idx" ON "CompAugment"("compId");

-- CreateIndex
CREATE INDEX "CompAugment_augmentId_idx" ON "CompAugment"("augmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompAugment_compId_augmentId_key" ON "CompAugment"("compId", "augmentId");

-- CreateIndex
CREATE INDEX "CompTierSnapshot_patchId_idx" ON "CompTierSnapshot"("patchId");

-- CreateIndex
CREATE UNIQUE INDEX "CompTierSnapshot_compId_patchId_key" ON "CompTierSnapshot"("compId", "patchId");

-- AddForeignKey
ALTER TABLE "CompTrait" ADD CONSTRAINT "CompTrait_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompTrait" ADD CONSTRAINT "CompTrait_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompUnit" ADD CONSTRAINT "CompUnit_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompUnit" ADD CONSTRAINT "CompUnit_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompUnitItem" ADD CONSTRAINT "CompUnitItem_compUnitId_fkey" FOREIGN KEY ("compUnitId") REFERENCES "CompUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompUnitItem" ADD CONSTRAINT "CompUnitItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompItemPriority" ADD CONSTRAINT "CompItemPriority_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompItemPriority" ADD CONSTRAINT "CompItemPriority_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAugment" ADD CONSTRAINT "CompAugment_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompAugment" ADD CONSTRAINT "CompAugment_augmentId_fkey" FOREIGN KEY ("augmentId") REFERENCES "Augment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompTierSnapshot" ADD CONSTRAINT "CompTierSnapshot_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompTierSnapshot" ADD CONSTRAINT "CompTierSnapshot_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
