-- Additive organisation Risk Framework and proportionate closure authority.
ALTER TYPE "RiskStatus" ADD VALUE 'CLOSURE_PROPOSED' BEFORE 'CLOSED';
CREATE TYPE "RiskFrameworkStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'EFFECTIVE', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "RiskClosureProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "RiskClosureApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

CREATE TABLE "RiskClosurePolicyVersion" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "versionNumber" INTEGER NOT NULL,
  "status" "RiskFrameworkStatus" NOT NULL DEFAULT 'DRAFT', "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3),
  "changeRationale" TEXT NOT NULL, "createdById" UUID NOT NULL, "submittedById" UUID, "approvedById" UUID,
  "submittedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RiskClosurePolicyVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskFrameworkVersion" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "versionNumber" INTEGER NOT NULL,
  "status" "RiskFrameworkStatus" NOT NULL DEFAULT 'DRAFT', "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3),
  "defaultAppetite" TEXT NOT NULL, "defaultToleranceScore" INTEGER NOT NULL, "defaultEscalation" TEXT,
  "changeRationale" TEXT NOT NULL, "closurePolicyVersionId" UUID NOT NULL, "createdById" UUID NOT NULL,
  "submittedById" UUID, "approvedById" UUID, "submittedAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskFrameworkVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskFrameworkRule" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "frameworkVersionId" UUID NOT NULL,
  "categoryKey" TEXT NOT NULL, "categoryLabel" TEXT NOT NULL, "appetite" TEXT NOT NULL,
  "toleranceScore" INTEGER NOT NULL, "escalationIndicator" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskFrameworkRule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskClosureAuthorityRule" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "policyVersionId" UUID NOT NULL,
  "riskLevel" "RiskLevel" NOT NULL, "categoryKey" TEXT NOT NULL DEFAULT '*',
  "proposerRoleKeys" TEXT[] NOT NULL, "approverRoleKeys" TEXT[] NOT NULL,
  "selfApprovalAllowed" BOOLEAN NOT NULL DEFAULT false, "requiredApprovalCount" INTEGER NOT NULL DEFAULT 1,
  "verifiedEvidenceRequired" BOOLEAN NOT NULL DEFAULT false, "effectivenessEvidenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "escalationRequirement" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskClosureAuthorityRule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskClosureProposal" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "locationId" UUID, "riskId" UUID NOT NULL,
  "frameworkVersionId" UUID, "policyVersionId" UUID, "status" "RiskClosureProposalStatus" NOT NULL DEFAULT 'PENDING',
  "previousRiskStatus" "RiskStatus" NOT NULL, "residualScoreSnapshot" INTEGER NOT NULL,
  "toleranceScoreSnapshot" INTEGER, "appetiteSnapshot" TEXT, "linkedActionReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rationale" TEXT NOT NULL, "proposedById" UUID NOT NULL, "proposedRoleKeySnapshot" TEXT NOT NULL,
  "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
  "withdrawnById" UUID, "withdrawnAt" TIMESTAMP(3), "withdrawalReason" TEXT,
  CONSTRAINT "RiskClosureProposal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RiskClosureProposalEvidence" (
  "proposalId" UUID NOT NULL, "evidenceId" UUID NOT NULL,
  CONSTRAINT "RiskClosureProposalEvidence_pkey" PRIMARY KEY ("proposalId", "evidenceId")
);
CREATE TABLE "RiskClosureApproval" (
  "id" UUID NOT NULL, "organisationId" UUID NOT NULL, "locationId" UUID, "riskId" UUID NOT NULL,
  "proposalId" UUID NOT NULL, "approverId" UUID NOT NULL, "membershipId" UUID NOT NULL, "policyVersionId" UUID,
  "decision" "RiskClosureApprovalDecision" NOT NULL, "roleKeySnapshot" TEXT NOT NULL,
  "authoritySnapshot" TEXT NOT NULL, "rationale" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskClosureApproval_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Risk" ADD COLUMN "categoryKey" TEXT;
ALTER TABLE "Risk" ADD COLUMN "riskFrameworkVersionId" UUID;
ALTER TABLE "Risk" ADD COLUMN "riskFrameworkRuleId" UUID;
ALTER TABLE "Risk" ADD COLUMN "frameworkAppetiteSnapshot" TEXT;
ALTER TABLE "Risk" ADD COLUMN "frameworkToleranceSnapshot" INTEGER;
ALTER TABLE "Risk" ADD COLUMN "frameworkInheritedAppetiteSnapshot" TEXT;
ALTER TABLE "Risk" ADD COLUMN "frameworkInheritedToleranceSnapshot" INTEGER;
ALTER TABLE "Risk" ADD COLUMN "frameworkAppliedAt" TIMESTAMP(3);
ALTER TABLE "Risk" ADD COLUMN "frameworkOverrideRationale" TEXT;
ALTER TABLE "Risk" ADD COLUMN "frameworkOverrideById" UUID;
ALTER TABLE "Risk" ADD COLUMN "frameworkOverrideAt" TIMESTAMP(3);
ALTER TABLE "Risk" ADD COLUMN "closurePolicyVersionId" UUID;
ALTER TABLE "Risk" ADD COLUMN "closureToleranceSnapshot" INTEGER;
ALTER TABLE "Risk" ADD COLUMN "closureAppetiteSnapshot" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN "categoryKeySnapshot" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN "riskFrameworkVersionId" UUID;
ALTER TABLE "RiskReview" ADD COLUMN "riskFrameworkRuleId" UUID;
ALTER TABLE "RiskReview" ADD COLUMN "frameworkAppetiteSnapshot" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN "frameworkToleranceSnapshot" INTEGER;
ALTER TABLE "RiskReview" ADD COLUMN "frameworkInheritedAppetiteSnapshot" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN "frameworkInheritedToleranceSnapshot" INTEGER;
ALTER TABLE "RiskReview" ADD COLUMN "frameworkOverrideRationale" TEXT;

CREATE UNIQUE INDEX "RiskClosurePolicyVersion_organisationId_versionNumber_key" ON "RiskClosurePolicyVersion"("organisationId", "versionNumber");
CREATE INDEX "RiskClosurePolicyVersion_organisationId_status_effectiveFrom_idx" ON "RiskClosurePolicyVersion"("organisationId", "status", "effectiveFrom");
CREATE UNIQUE INDEX "RiskFrameworkVersion_closurePolicyVersionId_key" ON "RiskFrameworkVersion"("closurePolicyVersionId");
CREATE UNIQUE INDEX "RiskFrameworkVersion_organisationId_versionNumber_key" ON "RiskFrameworkVersion"("organisationId", "versionNumber");
CREATE INDEX "RiskFrameworkVersion_organisationId_status_effectiveFrom_idx" ON "RiskFrameworkVersion"("organisationId", "status", "effectiveFrom");
CREATE UNIQUE INDEX "RiskFrameworkRule_frameworkVersionId_categoryKey_key" ON "RiskFrameworkRule"("frameworkVersionId", "categoryKey");
CREATE INDEX "RiskFrameworkRule_organisationId_categoryKey_idx" ON "RiskFrameworkRule"("organisationId", "categoryKey");
CREATE UNIQUE INDEX "RiskClosureAuthorityRule_policyVersionId_riskLevel_categoryKey_key" ON "RiskClosureAuthorityRule"("policyVersionId", "riskLevel", "categoryKey");
CREATE INDEX "RiskClosureAuthorityRule_organisationId_riskLevel_categoryKey_idx" ON "RiskClosureAuthorityRule"("organisationId", "riskLevel", "categoryKey");
CREATE INDEX "RiskClosureProposal_organisationId_status_proposedAt_idx" ON "RiskClosureProposal"("organisationId", "status", "proposedAt");
CREATE INDEX "RiskClosureProposal_riskId_status_idx" ON "RiskClosureProposal"("riskId", "status");
CREATE INDEX "RiskClosureProposalEvidence_evidenceId_idx" ON "RiskClosureProposalEvidence"("evidenceId");
CREATE UNIQUE INDEX "RiskClosureApproval_proposalId_approverId_key" ON "RiskClosureApproval"("proposalId", "approverId");
CREATE INDEX "RiskClosureApproval_organisationId_riskId_createdAt_idx" ON "RiskClosureApproval"("organisationId", "riskId", "createdAt");
CREATE INDEX "Risk_organisationId_categoryKey_status_idx" ON "Risk"("organisationId", "categoryKey", "status");
CREATE INDEX "Risk_riskFrameworkVersionId_idx" ON "Risk"("riskFrameworkVersionId");
CREATE INDEX "RiskReview_riskFrameworkVersionId_idx" ON "RiskReview"("riskFrameworkVersionId");

-- Database-level governance invariants. These prevent direct API or concurrent-write bypass.
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_defaultToleranceScore_check" CHECK ("defaultToleranceScore" BETWEEN 1 AND 25);
ALTER TABLE "RiskFrameworkRule" ADD CONSTRAINT "RiskFrameworkRule_toleranceScore_check" CHECK ("toleranceScore" BETWEEN 1 AND 25);
ALTER TABLE "RiskClosureAuthorityRule" ADD CONSTRAINT "RiskClosureAuthorityRule_requiredApprovalCount_check" CHECK ("requiredApprovalCount" BETWEEN 1 AND 5);
CREATE UNIQUE INDEX "RiskFrameworkVersion_one_working_copy_per_org" ON "RiskFrameworkVersion"("organisationId") WHERE "status" IN ('DRAFT', 'IN_REVIEW', 'APPROVED');
CREATE UNIQUE INDEX "RiskFrameworkVersion_one_effective_per_org" ON "RiskFrameworkVersion"("organisationId") WHERE "status" = 'EFFECTIVE';
CREATE UNIQUE INDEX "RiskClosurePolicyVersion_one_working_copy_per_org" ON "RiskClosurePolicyVersion"("organisationId") WHERE "status" IN ('DRAFT', 'IN_REVIEW', 'APPROVED');
CREATE UNIQUE INDEX "RiskClosurePolicyVersion_one_effective_per_org" ON "RiskClosurePolicyVersion"("organisationId") WHERE "status" = 'EFFECTIVE';
CREATE UNIQUE INDEX "RiskClosureProposal_one_pending_per_risk" ON "RiskClosureProposal"("riskId") WHERE "status" = 'PENDING';

ALTER TABLE "RiskClosurePolicyVersion" ADD CONSTRAINT "RiskClosurePolicyVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosurePolicyVersion" ADD CONSTRAINT "RiskClosurePolicyVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosurePolicyVersion" ADD CONSTRAINT "RiskClosurePolicyVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskClosurePolicyVersion" ADD CONSTRAINT "RiskClosurePolicyVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_closurePolicyVersionId_fkey" FOREIGN KEY ("closurePolicyVersionId") REFERENCES "RiskClosurePolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkVersion" ADD CONSTRAINT "RiskFrameworkVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkRule" ADD CONSTRAINT "RiskFrameworkRule_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskFrameworkRule" ADD CONSTRAINT "RiskFrameworkRule_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "RiskFrameworkVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskClosureAuthorityRule" ADD CONSTRAINT "RiskClosureAuthorityRule_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureAuthorityRule" ADD CONSTRAINT "RiskClosureAuthorityRule_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RiskClosurePolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_riskFrameworkVersionId_fkey" FOREIGN KEY ("riskFrameworkVersionId") REFERENCES "RiskFrameworkVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_riskFrameworkRuleId_fkey" FOREIGN KEY ("riskFrameworkRuleId") REFERENCES "RiskFrameworkRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_frameworkOverrideById_fkey" FOREIGN KEY ("frameworkOverrideById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_closurePolicyVersionId_fkey" FOREIGN KEY ("closurePolicyVersionId") REFERENCES "RiskClosurePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskReview" ADD CONSTRAINT "RiskReview_riskFrameworkVersionId_fkey" FOREIGN KEY ("riskFrameworkVersionId") REFERENCES "RiskFrameworkVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskReview" ADD CONSTRAINT "RiskReview_riskFrameworkRuleId_fkey" FOREIGN KEY ("riskFrameworkRuleId") REFERENCES "RiskFrameworkRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "RiskFrameworkVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RiskClosurePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposal" ADD CONSTRAINT "RiskClosureProposal_withdrawnById_fkey" FOREIGN KEY ("withdrawnById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposalEvidence" ADD CONSTRAINT "RiskClosureProposalEvidence_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "RiskClosureProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskClosureProposalEvidence" ADD CONSTRAINT "RiskClosureProposalEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "RiskClosureProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganisationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskClosureApproval" ADD CONSTRAINT "RiskClosureApproval_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "RiskClosurePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
