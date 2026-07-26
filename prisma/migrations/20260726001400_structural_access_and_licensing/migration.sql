CREATE TYPE "MembershipAccessMode" AS ENUM ('STANDARD', 'READ_ONLY');

ALTER TABLE "Organisation"
ADD COLUMN "licenceSeats" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "OrganisationMembership"
ADD COLUMN "accessMode" "MembershipAccessMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "jobTitle" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "reportsToId" UUID,
ADD COLUMN "permissionOverridesEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MembershipPermission" (
  "membershipId" UUID NOT NULL,
  "permissionId" UUID NOT NULL,
  CONSTRAINT "MembershipPermission_pkey" PRIMARY KEY ("membershipId", "permissionId")
);

CREATE INDEX "OrganisationMembership_organisationId_reportsToId_idx"
ON "OrganisationMembership"("organisationId", "reportsToId");

CREATE INDEX "MembershipPermission_permissionId_idx"
ON "MembershipPermission"("permissionId");

ALTER TABLE "OrganisationMembership"
ADD CONSTRAINT "OrganisationMembership_reportsToId_fkey"
FOREIGN KEY ("reportsToId") REFERENCES "OrganisationMembership"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MembershipPermission"
ADD CONSTRAINT "MembershipPermission_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "OrganisationMembership"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MembershipPermission"
ADD CONSTRAINT "MembershipPermission_permissionId_fkey"
FOREIGN KEY ("permissionId") REFERENCES "Permission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
