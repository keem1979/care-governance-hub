CREATE TYPE "TenantConfigurationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'SUPERSEDED', 'REJECTED');
CREATE TYPE "ConfigurationPromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "NotificationCategory" AS ENUM ('CRITICAL_SAFETY', 'ACTION_REMINDERS', 'WORKFORCE_EXPIRY', 'GOVERNANCE_DEADLINES', 'ASSISTANT_ESCALATIONS', 'PRODUCT_UPDATES');
CREATE TYPE "NotificationCadence" AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY');
CREATE TYPE "ImplementationStage" AS ENUM ('SETUP', 'SANDBOX', 'PILOT', 'READY', 'LIVE');
CREATE TYPE "ImplementationItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'BLOCKED');
CREATE TYPE "AdoptionEventOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'ABANDONED');

CREATE TABLE "TenantConfigurationVersion" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "TenantConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
  "settings" JSONB NOT NULL,
  "changeSummary" TEXT NOT NULL,
  "createdById" UUID NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "approvedById" UUID,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantConfigurationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfigurationPromotion" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "configurationVersionId" UUID NOT NULL,
  "status" "ConfigurationPromotionStatus" NOT NULL DEFAULT 'PENDING',
  "readinessSnapshot" JSONB NOT NULL,
  "requestedById" UUID NOT NULL,
  "reviewedById" UUID,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewComment" TEXT,
  CONSTRAINT "ConfigurationPromotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "cadence" "NotificationCadence" NOT NULL DEFAULT 'DAILY',
  "updatedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImplementationPlan" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "stage" "ImplementationStage" NOT NULL DEFAULT 'SETUP',
  "ownerId" UUID NOT NULL,
  "targetLiveDate" TIMESTAMP(3),
  "updatedById" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  "liveAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImplementationPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImplementationChecklistItem" (
  "id" UUID NOT NULL,
  "planId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "status" "ImplementationItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "evidenceNote" TEXT,
  "completedById" UUID,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImplementationChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAdoptionEvent" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "outcome" "AdoptionEventOutcome" NOT NULL DEFAULT 'SUCCESS',
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAdoptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantConfigurationVersion_organisationId_versionNumber_key" ON "TenantConfigurationVersion"("organisationId", "versionNumber");
CREATE INDEX "TenantConfigurationVersion_organisationId_status_createdAt_idx" ON "TenantConfigurationVersion"("organisationId", "status", "createdAt");
CREATE UNIQUE INDEX "ConfigurationPromotion_configurationVersionId_key" ON "ConfigurationPromotion"("configurationVersionId");
CREATE INDEX "ConfigurationPromotion_organisationId_status_requestedAt_idx" ON "ConfigurationPromotion"("organisationId", "status", "requestedAt");
CREATE UNIQUE INDEX "NotificationPreference_membershipId_category_key" ON "NotificationPreference"("membershipId", "category");
CREATE INDEX "NotificationPreference_organisationId_category_enabled_idx" ON "NotificationPreference"("organisationId", "category", "enabled");
CREATE UNIQUE INDEX "ImplementationPlan_organisationId_key" ON "ImplementationPlan"("organisationId");
CREATE INDEX "ImplementationPlan_stage_targetLiveDate_idx" ON "ImplementationPlan"("stage", "targetLiveDate");
CREATE UNIQUE INDEX "ImplementationChecklistItem_planId_key_key" ON "ImplementationChecklistItem"("planId", "key");
CREATE INDEX "ImplementationChecklistItem_planId_required_status_idx" ON "ImplementationChecklistItem"("planId", "required", "status");
CREATE INDEX "ProductAdoptionEvent_organisationId_createdAt_idx" ON "ProductAdoptionEvent"("organisationId", "createdAt");
CREATE INDEX "ProductAdoptionEvent_organisationId_moduleKey_eventName_outcome_createdAt_idx" ON "ProductAdoptionEvent"("organisationId", "moduleKey", "eventName", "outcome", "createdAt");
CREATE INDEX "ProductAdoptionEvent_userId_createdAt_idx" ON "ProductAdoptionEvent"("userId", "createdAt");

ALTER TABLE "TenantConfigurationVersion" ADD CONSTRAINT "TenantConfigurationVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantConfigurationVersion" ADD CONSTRAINT "TenantConfigurationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantConfigurationVersion" ADD CONSTRAINT "TenantConfigurationVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConfigurationPromotion" ADD CONSTRAINT "ConfigurationPromotion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfigurationPromotion" ADD CONSTRAINT "ConfigurationPromotion_configurationVersionId_fkey" FOREIGN KEY ("configurationVersionId") REFERENCES "TenantConfigurationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfigurationPromotion" ADD CONSTRAINT "ConfigurationPromotion_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfigurationPromotion" ADD CONSTRAINT "ConfigurationPromotion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganisationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImplementationPlan" ADD CONSTRAINT "ImplementationPlan_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImplementationPlan" ADD CONSTRAINT "ImplementationPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImplementationPlan" ADD CONSTRAINT "ImplementationPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImplementationChecklistItem" ADD CONSTRAINT "ImplementationChecklistItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ImplementationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImplementationChecklistItem" ADD CONSTRAINT "ImplementationChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductAdoptionEvent" ADD CONSTRAINT "ProductAdoptionEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAdoptionEvent" ADD CONSTRAINT "ProductAdoptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
