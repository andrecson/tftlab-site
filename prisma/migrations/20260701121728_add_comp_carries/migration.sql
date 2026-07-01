-- CreateTable
CREATE TABLE "CompCarry" (
    "id" TEXT NOT NULL,
    "compId" TEXT NOT NULL,
    "championId" TEXT NOT NULL,
    "starLevel" INTEGER NOT NULL DEFAULT 3,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompCarry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompCarryItem" (
    "id" TEXT NOT NULL,
    "compCarryId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CompCarryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompCarry_compId_idx" ON "CompCarry"("compId");

-- CreateIndex
CREATE INDEX "CompCarry_championId_idx" ON "CompCarry"("championId");

-- CreateIndex
CREATE INDEX "CompCarryItem_compCarryId_idx" ON "CompCarryItem"("compCarryId");

-- CreateIndex
CREATE INDEX "CompCarryItem_itemId_idx" ON "CompCarryItem"("itemId");

-- AddForeignKey
ALTER TABLE "CompCarry" ADD CONSTRAINT "CompCarry_compId_fkey" FOREIGN KEY ("compId") REFERENCES "Comp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompCarry" ADD CONSTRAINT "CompCarry_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Champion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompCarryItem" ADD CONSTRAINT "CompCarryItem_compCarryId_fkey" FOREIGN KEY ("compCarryId") REFERENCES "CompCarry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompCarryItem" ADD CONSTRAINT "CompCarryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
