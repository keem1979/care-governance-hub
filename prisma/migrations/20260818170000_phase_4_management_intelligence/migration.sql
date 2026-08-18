CREATE TYPE "ManagementCommandView" AS ENUM ('REGISTERED_MANAGER', 'OWNER', 'LOCATION', 'MY_WORK');
CREATE TYPE "ManagementFocus" AS ENUM ('ALL', 'CRITICAL', 'OVERDUE', 'UNVERIFIED', 'EXTERNAL');
CREATE TYPE "ManagementDelegationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

CREATE TABLE "ManagementSavedView" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locationId" UUID,
    "name" TEXT NOT NULL,
    "commandView" "ManagementCommandView" NOT NULL,
    "focus" "ManagementFocus" NOT NULL DEFAULT 'ALL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManagementSavedView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagementDelegation" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "locationId" UUID,
    "delegatorId" UUID NOT NULL,
    "delegateId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ManagementDelegationStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManagementDelegation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagementSavedView_organisationId_userId_name_key" ON "ManagementSavedView"("organisationId", "userId", "name");
CREATE INDEX "ManagementSavedView_organisationId_userId_isDefault_idx" ON "ManagementSavedView"("organisationId", "userId", "isDefault");
CREATE INDEX "ManagementSavedView_locationId_idx" ON "ManagementSavedView"("locationId");
CREATE INDEX "ManagementDelegation_organisationId_status_endsAt_idx" ON "ManagementDelegation"("organisationId", "status", "endsAt");
CREATE INDEX "ManagementDelegation_delegatorId_status_idx" ON "ManagementDelegation"("delegatorId", "status");
CREATE INDEX "ManagementDelegation_delegateId_status_idx" ON "ManagementDelegation"("delegateId", "status");
CREATE INDEX "ManagementDelegation_locationId_status_idx" ON "ManagementDelegation"("locationId", "status");

ALTER TABLE "ManagementSavedView" ADD CONSTRAINT "ManagementSavedView_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementSavedView" ADD CONSTRAINT "ManagementSavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementSavedView" ADD CONSTRAINT "ManagementSavedView_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "OrganisationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "OrganisationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_distinct_members_check" CHECK ("delegatorId" <> "delegateId");
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_date_order_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "ManagementDelegation" ADD CONSTRAINT "ManagementDelegation_responsibilities_check" CHECK (cardinality("responsibilities") > 0);
