\set ON_ERROR_STOP on
BEGIN;

-- Production-shaped records inserted immediately before the Action Evidence
-- & Assurance migration. These records must survive the forward upgrade.
UPDATE "Action"
SET status = 'COMPLETED',
    "progressPercent" = 100,
    "completionDate" = '2026-08-19T09:00:00Z',
    "verifiedById" = '10000000-0000-4000-8000-000000000002',
    "verificationDate" = '2026-08-20T09:00:00Z',
    "closureNote" = 'Legacy closure rationale retained through upgrade.',
    "verificationRationale" = 'Legacy verification rationale retained through upgrade.'
WHERE id = '10000000-0000-4000-8000-000000000011';

INSERT INTO "Verification" (
  id,"organisationId","locationId","actionId","verificationType",outcome,
  "completedWork","evidenceSummary","evidenceIds","successMeasureResult",
  "independenceConfirmed",rationale,"verifierId","verifiedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000060','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000011',
  'CLOSURE','VERIFIED','Legacy treatment completed','Legacy competency Evidence reviewed',
  ARRAY['10000000-0000-4000-8000-000000000021'],'No repeat concern at verification',true,
  'Legacy accepted verification must remain unchanged.','10000000-0000-4000-8000-000000000002',
  '2026-08-20T09:00:00Z','2026-08-20T09:00:00Z'
);

INSERT INTO "EffectivenessReview" (
  id,"organisationId","locationId","actionId","verificationId","reviewDate",outcome,
  "successMeasure",baseline,target,"observedResult","recurrenceFound","evidenceIds",decision,
  "reviewerId","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000060','2026-08-20T10:00:00Z','EFFECTIVE',
  'No repeat medicines finding','One prior finding','No recurrence','No recurrence in the monitored sample',false,
  ARRAY['10000000-0000-4000-8000-000000000020'],'Effective at the recorded review point.',
  '10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z'
);

INSERT INTO "ExternalDependency" (
  id,"organisationId","locationId","actionId","partyName",request,"requestedAt","dueDate",
  "responseSummary","interimControl","escalationRoute",status,"ownerId","resolvedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000062','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000011',
  'Fictional Pharmacy','Confirm medication review outcome','2026-08-18T09:00:00Z','2026-08-20T09:00:00Z',
  'Written response received','Daily MAR oversight','Escalate to Registered Manager','RESOLVED',
  '10000000-0000-4000-8000-000000000002','2026-08-20T08:00:00Z','2026-08-20T08:00:00Z'
);

INSERT INTO "RiskClosurePolicyVersion" (
  id,"organisationId","versionNumber",status,"effectiveFrom","changeRationale","createdById",
  "submittedById","approvedById","submittedAt","approvedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000070','10000000-0000-4000-8000-000000000001',1,'EFFECTIVE',
  '2026-04-01T00:00:00Z','Release-gate provider policy','10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
  '2026-03-20T09:00:00Z','2026-03-21T09:00:00Z','2026-03-21T09:00:00Z'
);

INSERT INTO "RiskFrameworkVersion" (
  id,"organisationId","versionNumber",status,"effectiveFrom","defaultAppetite","defaultToleranceScore",
  "defaultEscalation","changeRationale","closurePolicyVersionId","createdById","submittedById","approvedById",
  "submittedAt","approvedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000001',1,'EFFECTIVE',
  '2026-04-01T00:00:00Z','Very low',4,'Escalate above tolerance','Release-gate framework',
  '10000000-0000-4000-8000-000000000070','10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
  '2026-03-20T09:00:00Z','2026-03-21T09:00:00Z','2026-03-21T09:00:00Z'
);

INSERT INTO "RiskClosureAuthorityRule" (
  id,"organisationId","policyVersionId","riskLevel","categoryKey","proposerRoleKeys","approverRoleKeys",
  "selfApprovalAllowed","requiredApprovalCount","verifiedEvidenceRequired","effectivenessEvidenceRequired","escalationRequirement"
) VALUES (
  '10000000-0000-4000-8000-000000000072','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000070','HIGH','medicines',ARRAY['registered-manager'],
  ARRAY['registered-manager','nominated-individual'],false,1,true,true,'Provider leadership if control fails'
);

UPDATE "Risk"
SET "categoryKey"='medicines',
    "riskFrameworkVersionId"='10000000-0000-4000-8000-000000000071',
    "closurePolicyVersionId"='10000000-0000-4000-8000-000000000070',
    "frameworkAppetiteSnapshot"='Very low',"frameworkToleranceSnapshot"=4,
    "frameworkAppliedAt"='2026-04-01T00:00:00Z'
WHERE id='10000000-0000-4000-8000-000000000010';

INSERT INTO "ProviderControl" (id,"organisationId","stableKey","createdById","updatedAt") VALUES
('10000000-0000-4000-8000-000000000080','10000000-0000-4000-8000-000000000001','medicines-competency',
 '10000000-0000-4000-8000-000000000002','2026-04-01T00:00:00Z');

INSERT INTO "ProviderControlVersion" (
  id,"organisationId","controlId","versionNumber",status,title,description,family,
  "applicableRiskCategoryKeys","scopeType","accountableOwnerId","expectedEvidenceFamilyKeys",
  "expectedEvidenceTypeKeys","expectedEffectivenessMethod","effectiveFrom","reviewDueAt",
  "changeRationale","createdById","approvedById","approvedAt","updatedAt"
) VALUES (
  '10000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000080',1,'EFFECTIVE','Medicines competency assurance',
  'Current competency plus post-control audit','PEOPLE',ARRAY['medicines'],'ORGANISATION',
  '10000000-0000-4000-8000-000000000002',ARRAY['workforce'],ARRAY['competency'],
  'Review subsequent MAR audit','2026-04-01T00:00:00Z','2027-04-01T00:00:00Z',
  'Initial approved control','10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002','2026-03-21T09:00:00Z','2026-03-21T09:00:00Z'
);
UPDATE "ProviderControl" SET "currentVersionId"='10000000-0000-4000-8000-000000000081'
WHERE id='10000000-0000-4000-8000-000000000080';

INSERT INTO "ActivityLog" (
  id,"organisationId","locationId","userId",action,"recordType","recordId",summary,"afterValue","createdAt"
) VALUES (
  '10000000-0000-4000-8000-000000000090','10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','APPROVAL',
  'ActionClosure','10000000-0000-4000-8000-000000000011','Legacy Action closure approved',
  '{"decision":"legacy-approved"}'::jsonb,'2026-08-20T09:30:00Z'
);

COMMIT;
