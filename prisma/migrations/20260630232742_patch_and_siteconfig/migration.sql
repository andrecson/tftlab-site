-- CreateTable
CREATE TABLE "Patch" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "set" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "currentSet" TEXT NOT NULL,
    "currentPatchId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patch_version_key" ON "Patch"("version");

-- CreateIndex
CREATE INDEX "Patch_set_idx" ON "Patch"("set");

-- AddForeignKey
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_currentPatchId_fkey" FOREIGN KEY ("currentPatchId") REFERENCES "Patch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
