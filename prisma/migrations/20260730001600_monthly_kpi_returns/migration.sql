CREATE TYPE "KpiReturnStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'SUBMITTED', 'LOCKED');

CREATE TABLE "KpiReturn" (
    "id" UUID NOT NULL,
    "organisationId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "reportingMonth" TIMESTAMP(3) NOT NULL,
    "localAuthority" TEXT NOT NULL,
    "contractName" TEXT,
    "providerCode" TEXT,
    "locationCode" TEXT,
    "ecmSystem" TEXT,
    "status" "KpiReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "managerComment" TEXT,
    "createdById" UUID NOT NULL,
    "submittedById" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiReturn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KpiReturn_organisationId_locationId_reportingMonth_key"
ON "KpiReturn"("organisationId", "locationId", "reportingMonth");

CREATE INDEX "KpiReturn_organisationId_reportingMonth_status_idx"
ON "KpiReturn"("organisationId", "reportingMonth", "status");

CREATE INDEX "KpiReturn_locationId_reportingMonth_idx"
ON "KpiReturn"("locationId", "reportingMonth");

ALTER TABLE "KpiReturn" ADD CONSTRAINT "KpiReturn_organisationId_fkey"
FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KpiReturn" ADD CONSTRAINT "KpiReturn_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KpiReturn" ADD CONSTRAINT "KpiReturn_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KpiReturn" ADD CONSTRAINT "KpiReturn_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
