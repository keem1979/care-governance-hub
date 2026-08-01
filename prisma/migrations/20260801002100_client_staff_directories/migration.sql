DO $$ BEGIN
  CREATE TYPE "ClientStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'PAUSED', 'ENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "Client" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "clientReference" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "preferredName" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "pronouns" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "addressLine" TEXT,
  "town" TEXT,
  "postcode" TEXT,
  "commissionerReference" TEXT,
  "serviceStartDate" TIMESTAMP(3),
  "serviceEndDate" TIMESTAMP(3),
  "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  "communicationSummary" TEXT,
  "emergencyContact" TEXT,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Client_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Client_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Client_organisationId_clientReference_key" ON "Client"("organisationId", "clientReference");
CREATE INDEX "Client_organisationId_status_idx" ON "Client"("organisationId", "status");
CREATE INDEX "Client_locationId_idx" ON "Client"("locationId");
CREATE INDEX "Client_organisationId_lastName_firstName_idx" ON "Client"("organisationId", "lastName", "firstName");

ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "preferredName" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "workEmail" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "workPhone" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "employmentType" TEXT;

ALTER TABLE "RegisterEntry" ADD COLUMN IF NOT EXISTS "clientId" UUID;
ALTER TABLE "RegisterEntry" ADD COLUMN IF NOT EXISTS "staffMemberId" UUID;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegisterEntry" ADD CONSTRAINT "RegisterEntry_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "RegisterEntry_clientId_eventDate_idx" ON "RegisterEntry"("clientId", "eventDate");
CREATE INDEX "RegisterEntry_staffMemberId_eventDate_idx" ON "RegisterEntry"("staffMemberId", "eventDate");
