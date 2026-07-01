-- AlterTable
ALTER TABLE "Comp" ADD COLUMN     "situationalAugmentId" TEXT,
ADD COLUMN     "situationalItemId" TEXT;

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_situationalItemId_fkey" FOREIGN KEY ("situationalItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_situationalAugmentId_fkey" FOREIGN KEY ("situationalAugmentId") REFERENCES "Augment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
