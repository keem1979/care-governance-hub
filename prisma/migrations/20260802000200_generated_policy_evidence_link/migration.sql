ALTER TABLE "Evidence"
  ADD COLUMN "generatedPolicyId" UUID,
  ADD COLUMN "generatedPolicyTemplateKey" TEXT;

CREATE UNIQUE INDEX "Evidence_generatedPolicyId_key" ON "Evidence"("generatedPolicyId");
CREATE UNIQUE INDEX "Evidence_organisationId_generatedPolicyTemplateKey_key"
  ON "Evidence"("organisationId", "generatedPolicyTemplateKey");

ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_generatedPolicyId_fkey"
  FOREIGN KEY ("generatedPolicyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Evidence" (
  "id", "organisationId", "title", "description", "category", "evidenceType",
  "ownerId", "evidenceDate", "reviewExpiryDate", "tags", "relatedModule",
  "relatedRecordId", "generatedPolicyId", "generatedPolicyTemplateKey", "confidentiality", "status", "notes",
  "archivedAt", "uploadedById", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), p."organisationId", LEFT('Policy: ' || p."title", 180),
  'Live policy from the ATOM Policy Studio. The Evidence Library links to the controlled policy; it does not store a duplicate document.',
  'Policies', CASE WHEN p."approvalStatus" = 'APPROVED' THEN 'Approved policy' ELSE 'Policy record' END,
  p."ownerId", p."effectiveDate", p."nextReviewDate",
  ARRAY['system-generated', 'policy-studio', 'policy-template:' || p."templateKey", 'policy-status:' || lower(p."status"::text)],
  'Policy', p."id"::text, p."id", p."templateKey", 'INTERNAL',
  CASE WHEN p."status" = 'ARCHIVED' THEN 'ARCHIVED'::"EvidenceWorkflowStatus" ELSE 'ACTIVE'::"EvidenceWorkflowStatus" END,
  'One-copy live evidence link. Changes, approval and review dates stay synchronised from the source policy.',
  p."archivedAt", p."createdById", p."createdAt", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ("organisationId", "templateKey") *
  FROM "Policy"
  WHERE "templateKey" IS NOT NULL AND "generatedSections" IS NOT NULL
  ORDER BY "organisationId", "templateKey", ("status" <> 'ARCHIVED') DESC, "createdAt" DESC
) p
WHERE p."templateKey" IS NOT NULL AND p."generatedSections" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Evidence" e
    WHERE e."organisationId" = p."organisationId"
      AND e."generatedPolicyTemplateKey" = p."templateKey"
  );
