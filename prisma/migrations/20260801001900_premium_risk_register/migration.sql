ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "cause" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "riskEvent" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "consequence" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "peopleAffected" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "sourceReference" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "identifiedDate" TIMESTAMP(3);
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "controlEffectiveness" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "controlAssurance" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "treatmentStrategy" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "appetite" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "toleranceScore" INTEGER;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "acceptanceRationale" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "targetLikelihood" INTEGER;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "targetImpact" INTEGER;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "targetScore" INTEGER;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "targetLevel" "RiskLevel";
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "keyRiskIndicator" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "indicatorThreshold" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "escalationRoute" TEXT;
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "reviewTriggers" TEXT;

ALTER TABLE "RiskReview" ADD COLUMN IF NOT EXISTS "controlChanges" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN IF NOT EXISTS "assuranceChecked" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN IF NOT EXISTS "trend" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN IF NOT EXISTS "decision" TEXT;
ALTER TABLE "RiskReview" ADD COLUMN IF NOT EXISTS "escalated" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Risk" SET
  "riskEvent"=COALESCE("riskEvent","title"),
  "consequence"=COALESCE("consequence","description"),
  "sourceType"=COALESCE("sourceType",'Manual identification'),
  "identifiedDate"=COALESCE("identifiedDate","createdAt"),
  "controlEffectiveness"=COALESCE("controlEffectiveness",'PARTIALLY_EFFECTIVE'),
  "treatmentStrategy"=COALESCE("treatmentStrategy",'REDUCE'),
  "appetite"=COALESCE("appetite",'LOW'),
  "toleranceScore"=COALESCE("toleranceScore",9),
  "targetLikelihood"=COALESCE("targetLikelihood","residualLikelihood"),
  "targetImpact"=COALESCE("targetImpact","residualImpact"),
  "targetScore"=COALESCE("targetScore","residualScore"),
  "targetLevel"=COALESCE("targetLevel","residualLevel");

CREATE INDEX IF NOT EXISTS "Risk_organisationId_toleranceScore_idx" ON "Risk"("organisationId","toleranceScore");

INSERT INTO "Evidence" (
  "id","organisationId","locationId","title","description","category","evidenceType","ownerId",
  "evidenceDate","reviewExpiryDate","tags","relatedModule","relatedRecordId","confidentiality","status",
  "notes","archivedAt","uploadedById","createdAt","updatedAt"
)
SELECT md5('risk-evidence:'||r."id"::text)::uuid,r."organisationId",r."locationId",
  left('Live risk: '||r."reference"||' — '||r."title",180),r."description",'Health and safety','Risk assurance record',
  COALESCE(r."ownerId",r."createdById"),COALESCE(r."identifiedDate",r."createdAt"),r."nextReviewDate",
  ARRAY['system-generated','risk','risk-category:'||lower(replace(r."category",' ','-')),'requirement:well-risk-register'],
  'Risk',r."id"::text,'CONFIDENTIAL'::"EvidenceConfidentiality",
  CASE WHEN r."status"='ARCHIVED' THEN 'ARCHIVED'::"EvidenceWorkflowStatus" ELSE 'ACTIVE'::"EvidenceWorkflowStatus" END,
  'Generated from the Risk Register and kept in sync with its owner, controls, score, review date and status. Open the source risk for the full control and review history.',
  CASE WHEN r."status"='ARCHIVED' THEN COALESCE(r."archivedAt",CURRENT_TIMESTAMP) ELSE NULL END,
  r."createdById",r."createdAt",CURRENT_TIMESTAMP
FROM "Risk" r
WHERE NOT EXISTS (SELECT 1 FROM "Evidence" e WHERE e."organisationId"=r."organisationId" AND e."relatedModule"='Risk' AND e."relatedRecordId"=r."id"::text);

INSERT INTO "RiskEvidence" ("riskId","evidenceId")
SELECT r."id",e."id" FROM "Risk" r JOIN "Evidence" e ON e."organisationId"=r."organisationId" AND e."relatedModule"='Risk' AND e."relatedRecordId"=r."id"::text
ON CONFLICT DO NOTHING;
