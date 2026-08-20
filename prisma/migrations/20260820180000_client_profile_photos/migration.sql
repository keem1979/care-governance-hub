ALTER TABLE "Client"
  ADD COLUMN "profilePhotoKey" TEXT,
  ADD COLUMN "profilePhotoType" TEXT;

CREATE UNIQUE INDEX "Client_profilePhotoKey_key" ON "Client"("profilePhotoKey");
