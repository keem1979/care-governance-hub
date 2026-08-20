CREATE TYPE "GovernanceDecisionImpact" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE "GovernanceDecisionStatus" AS ENUM ('RECORDED', 'ACTION_REQUIRED', 'IMPLEMENTED', 'REVIEWED', 'SUPERSEDED', 'WITHDRAWN');
CREATE TYPE "GovernanceObligationType" AS ENUM ('COMMISSIONER_RETURN', 'REGULATORY_NOTIFICATION', 'CONTRACT_REVIEW', 'INFORMATION_REQUEST', 'OTHER');
CREATE TYPE "GovernanceObligationSource" AS ENUM ('KPI_RETURN', 'CALENDAR_ITEM', 'GOVERNANCE_DECISION', 'ACTION', 'MANUAL');
CREATE TYPE "GovernanceObligationStatus" AS ENUM ('OPEN', 'PREPARING', 'SUBMITTED', 'QUERY_RECEIVED', 'ACCEPTED', 'CLOSED', 'CANCELLED');
CREATE TYPE "GovernanceObligationUpdateType" AS ENUM ('NOTE', 'CHASE', 'SUBMISSION', 'QUERY', 'RESPONSE', 'ACCEPTANCE', 'CLOSURE', 'ESCALATION');

CREATE TABLE "GovernanceDecision" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "meetingId" UUID NOT NULL,
  "agendaItemId" UUID NOT NULL,
  "decisionText" TEXT NOT NULL,
  "impact" "GovernanceDecisionImpact" NOT NULL DEFAULT 'MODERATE',
  "status" "GovernanceDecisionStatus" NOT NULL DEFAULT 'RECORDED',
  "ownerId" UUID NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "reviewDueAt" TIMESTAMP(3),
  "linkedActionId" UUID,
  "externalPartyId" UUID,
  "implementationEvidenceId" UUID,
  "implementationNote" TEXT,
  "implementedById" UUID,
  "implementedAt" TIMESTAMP(3),
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewOutcome" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovernanceDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GovernanceObligation" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "reference" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "obligationType" "GovernanceObligationType" NOT NULL,
  "sourceType" "GovernanceObligationSource" NOT NULL DEFAULT 'MANUAL',
  "sourceRecordId" UUID,
  "sourceHref" TEXT,
  "externalPartyId" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "responseDueAt" TIMESTAMP(3),
  "status" "GovernanceObligationStatus" NOT NULL DEFAULT 'OPEN',
  "submissionReference" TEXT,
  "latestResponse" TEXT,
  "interimControl" TEXT NOT NULL,
  "escalationRoute" TEXT NOT NULL,
  "lastChasedAt" TIMESTAMP(3),
  "chaseCount" INTEGER NOT NULL DEFAULT 0,
  "evidenceId" UUID,
  "closedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GovernanceObligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GovernanceObligationUpdate" (
  "id" UUID NOT NULL,
  "obligationId" UUID NOT NULL,
  "updateType" "GovernanceObligationUpdateType" NOT NULL,
  "note" TEXT NOT NULL,
  "evidenceId" UUID,
  "actorId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GovernanceObligationUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GovernanceDecision_agendaItemId_key" ON "GovernanceDecision"("agendaItemId");
CREATE INDEX "GovernanceDecision_organisationId_status_reviewDueAt_idx" ON "GovernanceDecision"("organisationId", "status", "reviewDueAt");
CREATE INDEX "GovernanceDecision_locationId_status_idx" ON "GovernanceDecision"("locationId", "status");
CREATE INDEX "GovernanceDecision_ownerId_status_idx" ON "GovernanceDecision"("ownerId", "status");
CREATE INDEX "GovernanceDecision_meetingId_idx" ON "GovernanceDecision"("meetingId");

CREATE UNIQUE INDEX "GovernanceObligation_organisationId_reference_key" ON "GovernanceObligation"("organisationId", "reference");
CREATE UNIQUE INDEX "GovernanceObligation_organisationId_sourceType_sourceRecordId_key" ON "GovernanceObligation"("organisationId", "sourceType", "sourceRecordId");
CREATE INDEX "GovernanceObligation_organisationId_status_dueAt_idx" ON "GovernanceObligation"("organisationId", "status", "dueAt");
CREATE INDEX "GovernanceObligation_locationId_status_idx" ON "GovernanceObligation"("locationId", "status");
CREATE INDEX "GovernanceObligation_externalPartyId_status_idx" ON "GovernanceObligation"("externalPartyId", "status");
CREATE INDEX "GovernanceObligation_ownerId_status_idx" ON "GovernanceObligation"("ownerId", "status");
CREATE INDEX "GovernanceObligationUpdate_obligationId_createdAt_idx" ON "GovernanceObligationUpdate"("obligationId", "createdAt");
CREATE INDEX "GovernanceObligationUpdate_actorId_createdAt_idx" ON "GovernanceObligationUpdate"("actorId", "createdAt");

ALTER TABLE "ExternalParty" ADD CONSTRAINT "ExternalParty_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalParty" ADD CONSTRAINT "ExternalParty_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalDependency" ADD CONSTRAINT "ExternalDependency_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalDependency" ADD CONSTRAINT "ExternalDependency_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExternalDependency" ADD CONSTRAINT "ExternalDependency_externalPartyId_fkey" FOREIGN KEY ("externalPartyId") REFERENCES "ExternalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalDependency" ADD CONSTRAINT "ExternalDependency_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "GovernanceMeeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_linkedActionId_fkey" FOREIGN KEY ("linkedActionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_externalPartyId_fkey" FOREIGN KEY ("externalPartyId") REFERENCES "ExternalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_implementationEvidenceId_fkey" FOREIGN KEY ("implementationEvidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_implementedById_fkey" FOREIGN KEY ("implementedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceDecision" ADD CONSTRAINT "GovernanceDecision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_externalPartyId_fkey" FOREIGN KEY ("externalPartyId") REFERENCES "ExternalParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligation" ADD CONSTRAINT "GovernanceObligation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligationUpdate" ADD CONSTRAINT "GovernanceObligationUpdate_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "GovernanceObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligationUpdate" ADD CONSTRAINT "GovernanceObligationUpdate_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GovernanceObligationUpdate" ADD CONSTRAINT "GovernanceObligationUpdate_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
