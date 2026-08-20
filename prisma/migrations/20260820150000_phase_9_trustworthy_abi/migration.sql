CREATE TYPE "AssistantResponseClass" AS ENUM ('GREETING', 'NAVIGATION', 'KNOWN', 'UNCERTAIN', 'PROHIBITED', 'ACCESS_DENIED');
CREATE TYPE "AssistantConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NONE');
CREATE TYPE "AssistantSourceKind" AS ENUM ('INTERNAL_MODULE', 'INTERNAL_CONTROL', 'OFFICIAL_REGULATOR');
CREATE TYPE "AssistantFeedbackRating" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'UNSAFE');
CREATE TYPE "AssistantEscalationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');
CREATE TYPE "AssistantEscalationPriority" AS ENUM ('ROUTINE', 'HIGH', 'IMMEDIATE');

CREATE TABLE "AIInteractionLog" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "userId" UUID NOT NULL,
  "queryHash" TEXT NOT NULL,
  "queryRedacted" TEXT NOT NULL,
  "currentPath" TEXT,
  "responseClass" "AssistantResponseClass" NOT NULL,
  "confidence" "AssistantConfidence" NOT NULL,
  "topicName" TEXT,
  "answerHash" TEXT NOT NULL,
  "answerText" TEXT NOT NULL,
  "escalationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIInteractionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIInteractionSource" (
  "id" UUID NOT NULL,
  "interactionId" UUID NOT NULL,
  "kind" "AssistantSourceKind" NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "authority" TEXT NOT NULL,
  "versionLabel" TEXT,
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIInteractionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantFeedback" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "interactionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "rating" "AssistantFeedbackRating" NOT NULL,
  "commentRedacted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantEscalation" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "locationId" UUID,
  "interactionId" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "priority" "AssistantEscalationPriority" NOT NULL,
  "status" "AssistantEscalationStatus" NOT NULL DEFAULT 'OPEN',
  "reasonCode" TEXT NOT NULL,
  "questionRedacted" TEXT NOT NULL,
  "raisedById" UUID NOT NULL,
  "assignedToId" UUID,
  "response" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantEscalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIInteractionLog_organisationId_responseClass_createdAt_idx" ON "AIInteractionLog"("organisationId", "responseClass", "createdAt");
CREATE INDEX "AIInteractionLog_organisationId_confidence_createdAt_idx" ON "AIInteractionLog"("organisationId", "confidence", "createdAt");
CREATE INDEX "AIInteractionLog_locationId_createdAt_idx" ON "AIInteractionLog"("locationId", "createdAt");
CREATE INDEX "AIInteractionLog_userId_createdAt_idx" ON "AIInteractionLog"("userId", "createdAt");
CREATE INDEX "AIInteractionLog_queryHash_idx" ON "AIInteractionLog"("queryHash");
CREATE INDEX "AIInteractionSource_interactionId_idx" ON "AIInteractionSource"("interactionId");
CREATE INDEX "AIInteractionSource_kind_authority_idx" ON "AIInteractionSource"("kind", "authority");
CREATE UNIQUE INDEX "AssistantFeedback_interactionId_key" ON "AssistantFeedback"("interactionId");
CREATE INDEX "AssistantFeedback_organisationId_rating_createdAt_idx" ON "AssistantFeedback"("organisationId", "rating", "createdAt");
CREATE INDEX "AssistantFeedback_userId_createdAt_idx" ON "AssistantFeedback"("userId", "createdAt");
CREATE UNIQUE INDEX "AssistantEscalation_interactionId_key" ON "AssistantEscalation"("interactionId");
CREATE UNIQUE INDEX "AssistantEscalation_organisationId_reference_key" ON "AssistantEscalation"("organisationId", "reference");
CREATE INDEX "AssistantEscalation_organisationId_status_priority_createdAt_idx" ON "AssistantEscalation"("organisationId", "status", "priority", "createdAt");
CREATE INDEX "AssistantEscalation_locationId_status_idx" ON "AssistantEscalation"("locationId", "status");
CREATE INDEX "AssistantEscalation_assignedToId_status_idx" ON "AssistantEscalation"("assignedToId", "status");
CREATE INDEX "AssistantEscalation_raisedById_createdAt_idx" ON "AssistantEscalation"("raisedById", "createdAt");

ALTER TABLE "AIInteractionLog" ADD CONSTRAINT "AIInteractionLog_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIInteractionLog" ADD CONSTRAINT "AIInteractionLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIInteractionLog" ADD CONSTRAINT "AIInteractionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIInteractionSource" ADD CONSTRAINT "AIInteractionSource_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "AIInteractionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "AIInteractionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ServiceLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "AIInteractionLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssistantEscalation" ADD CONSTRAINT "AssistantEscalation_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
