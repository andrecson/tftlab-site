-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('S', 'A', 'B', 'C', 'X');

-- CreateEnum
CREATE TYPE "CompStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AugmentCategory" AS ENUM ('ECON', 'ITEMS', 'COMBAT');

-- CreateTable
CREATE TABLE "Comp" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "situational" BOOLEAN NOT NULL DEFAULT false,
    "status" "CompStatus" NOT NULL DEFAULT 'DRAFT',
    "playstyle" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "whenToPlay" TEXT,
    "earlyGame" TEXT,
    "midGame" TEXT,
    "lateGame" TEXT,
    "tips" TEXT,
    "augmentPriority" "AugmentCategory"[],
    "patchIntroducedId" TEXT NOT NULL,
    "patchUpdatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Comp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comp_slug_key" ON "Comp"("slug");

-- CreateIndex
CREATE INDEX "Comp_set_status_tier_idx" ON "Comp"("set", "status", "tier");

-- CreateIndex
CREATE INDEX "Comp_status_idx" ON "Comp"("status");

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_patchIntroducedId_fkey" FOREIGN KEY ("patchIntroducedId") REFERENCES "Patch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_patchUpdatedId_fkey" FOREIGN KEY ("patchUpdatedId") REFERENCES "Patch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
