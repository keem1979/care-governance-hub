ALTER TABLE "Organisation"
  ADD COLUMN "policyBrandName" TEXT,
  ADD COLUMN "policyRegistrationNumber" TEXT,
  ADD COLUMN "policyAddress" TEXT,
  ADD COLUMN "policyEmail" TEXT,
  ADD COLUMN "policyPhone" TEXT,
  ADD COLUMN "policyWebsite" TEXT,
  ADD COLUMN "policyPrimaryColour" TEXT NOT NULL DEFAULT '#0f766e',
  ADD COLUMN "policyFooterText" TEXT,
  ADD COLUMN "policyLogoStorageKey" TEXT;

ALTER TABLE "Policy"
  ADD COLUMN "templateKey" TEXT,
  ADD COLUMN "templateVersion" TEXT,
  ADD COLUMN "generatedSections" JSONB,
  ADD COLUMN "sourceAnnex" JSONB,
  ADD COLUMN "sourceCheckedAt" TIMESTAMP(3),
  ADD COLUMN "customisationNotes" TEXT,
  ADD COLUMN "updateAvailable" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Policy_organisationId_templateKey_idx" ON "Policy"("organisationId", "templateKey");
