DROP INDEX IF EXISTS "Policy_organisationId_templateKey_idx";

ALTER TABLE "Policy"
  DROP COLUMN "templateKey",
  DROP COLUMN "templateVersion",
  DROP COLUMN "generatedSections",
  DROP COLUMN "sourceAnnex",
  DROP COLUMN "sourceCheckedAt",
  DROP COLUMN "customisationNotes",
  DROP COLUMN "updateAvailable";

ALTER TABLE "Organisation"
  DROP COLUMN "policyBrandName",
  DROP COLUMN "policyRegistrationNumber",
  DROP COLUMN "policyAddress",
  DROP COLUMN "policyEmail",
  DROP COLUMN "policyPhone",
  DROP COLUMN "policyWebsite",
  DROP COLUMN "policyPrimaryColour",
  DROP COLUMN "policyFooterText",
  DROP COLUMN "policyLogoStorageKey";
