-- AlterTable
ALTER TABLE "Comp" ADD COLUMN     "coverChampionId" TEXT;

-- AddForeignKey
ALTER TABLE "Comp" ADD CONSTRAINT "Comp_coverChampionId_fkey" FOREIGN KEY ("coverChampionId") REFERENCES "Champion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
