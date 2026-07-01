-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('COMPONENT', 'COMPLETED', 'ARTIFACT', 'RADIANT', 'EMBLEM', 'SUPPORT', 'OTHER');

-- CreateTable
CREATE TABLE "Champion" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Champion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "set" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trait" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "breakpoints" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Augment" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "tier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Augment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionTrait" (
    "id" TEXT NOT NULL,
    "championId" TEXT NOT NULL,
    "traitId" TEXT NOT NULL,

    CONSTRAINT "ChampionTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Champion_set_idx" ON "Champion"("set");

-- CreateIndex
CREATE UNIQUE INDEX "Champion_apiId_set_key" ON "Champion"("apiId", "set");

-- CreateIndex
CREATE INDEX "Item_set_idx" ON "Item"("set");

-- CreateIndex
CREATE UNIQUE INDEX "Item_apiId_set_key" ON "Item"("apiId", "set");

-- CreateIndex
CREATE INDEX "Trait_set_idx" ON "Trait"("set");

-- CreateIndex
CREATE UNIQUE INDEX "Trait_apiId_set_key" ON "Trait"("apiId", "set");

-- CreateIndex
CREATE INDEX "Augment_set_idx" ON "Augment"("set");

-- CreateIndex
CREATE UNIQUE INDEX "Augment_apiId_set_key" ON "Augment"("apiId", "set");

-- CreateIndex
CREATE INDEX "ChampionTrait_traitId_idx" ON "ChampionTrait"("traitId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionTrait_championId_traitId_key" ON "ChampionTrait"("championId", "traitId");

-- AddForeignKey
ALTER TABLE "ChampionTrait" ADD CONSTRAINT "ChampionTrait_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionTrait" ADD CONSTRAINT "ChampionTrait_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;
