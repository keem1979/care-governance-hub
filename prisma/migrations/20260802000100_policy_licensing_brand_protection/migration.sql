ALTER TABLE "Organisation"
  ADD COLUMN "policyLogoContentType" TEXT,
  ADD COLUMN "policyLogoFileName" TEXT,
  ADD COLUMN "policyLogoUploadedAt" TIMESTAMP(3);
