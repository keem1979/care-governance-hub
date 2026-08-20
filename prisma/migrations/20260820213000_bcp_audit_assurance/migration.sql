ALTER TABLE "AuditResponse" ADD COLUMN IF NOT EXISTS "evidenceSourceType" TEXT;
ALTER TABLE "AuditResponse" ADD COLUMN IF NOT EXISTS "evidenceSourceReference" TEXT;
CREATE INDEX IF NOT EXISTS "AuditResponse_evidenceSourceType_idx" ON "AuditResponse"("evidenceSourceType");

UPDATE "AuditTemplate"
SET "isPublished" = false
WHERE "organisationId" IS NULL
  AND "key" = 'business-continuity-audit'
  AND "version" <> '2.0';

INSERT INTO "AuditTemplate" (
  "id", "organisationId", "key", "name", "description", "category", "standardRefs",
  "frequency", "serviceSpecific", "version", "isPublished", "createdAt", "updatedAt"
)
VALUES (
  md5('audit-template:business-continuity-audit:2.0')::uuid,
  NULL,
  'business-continuity-audit',
  'Business-continuity audit',
  'Premium registered-manager assurance of business impact analysis, safe-care priorities, scenario arrangements, dependencies, communications, recovery and tested improvement.',
  'Leadership and governance',
  ARRAY['CQC Regulations 12 and 17', 'CQC Well-led: planning for the future', 'UK GDPR security and availability principles']::TEXT[],
  'Annual, after material change and after every activation or exercise',
  false,
  '2.0',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "description" = EXCLUDED."description",
  "standardRefs" = EXCLUDED."standardRefs",
  "frequency" = EXCLUDED."frequency",
  "isPublished" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

WITH sections(sort_order, title, description) AS (VALUES
  (1, 'Governance, ownership and activation readiness', 'Confirm that the controlled plan can be found, activated and led without avoidable delay.'),
  (2, 'Business impact and safe-care priorities', 'Test whether critical activities, people at greatest risk and recovery requirements are evidence based.'),
  (3, 'Scenario controls and critical dependencies', 'Review credible disruptions and the practical alternatives needed to maintain safe support.'),
  (4, 'Communication and multi-agency coordination', 'Assure contact routes, accessible communication, escalation and partner coordination.'),
  (5, 'Information, technology and records recovery', 'Check that essential information remains available, secure and recoverable during disruption.'),
  (6, 'Exercises, activation, recovery and improvement', 'Verify that exercises and real events produce evidenced learning, owned action and retesting.')
)
INSERT INTO "AuditSection" ("id", "templateId", "title", "description", "sortOrder")
SELECT
  md5('audit-bcp-v2-section:' || sections.sort_order)::uuid,
  md5('audit-template:business-continuity-audit:2.0')::uuid,
  sections.title,
  sections.description,
  sections.sort_order
FROM sections
ON CONFLICT ("templateId", "sortOrder") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description";

WITH questions(section_order, sort_order, question, evidence, weighting) AS (VALUES
  (1, 1, 'Is the business continuity plan approved, version controlled, within review date and aligned with current services and locations?', 'Approved plan, version history, review approval and service/location schedule.', 3),
  (1, 2, 'Are incident command, deputy, on-call, decision-making and recovery responsibilities named with current contact details?', 'Roles, deputies, on-call rota, contact tree and escalation authority.', 3),
  (1, 3, 'Can authorised staff access the plan, essential contacts and critical procedures when premises, power or normal systems are unavailable?', 'Offline copies, secure remote access test, grab pack and staff awareness checks.', 3),
  (1, 4, 'Are activation thresholds, severity levels, decision logs, handover and stand-down criteria clear and usable?', 'Activation checklist, severity matrix, decision-log template and stand-down criteria.', 3),
  (2, 1, 'Does a current business impact analysis identify critical activities, maximum tolerable disruption and recovery time objectives?', 'Business impact assessment, critical-activity register, MTPD and recovery targets.', 3),
  (2, 2, 'Are people at greatest risk prioritised using current needs, medicines, equipment, communication and safeguarding information?', 'Priority list using internal references, current care/risk records and escalation rationale.', 3),
  (2, 3, 'Are minimum safe staffing, leadership cover, competencies and welfare arrangements defined for each critical service?', 'Minimum staffing matrix, skill requirements, management cover and welfare controls.', 3),
  (2, 4, 'Are restoration priorities, acceptable temporary service changes and commissioner escalation thresholds documented?', 'Recovery priorities, temporary-service criteria, risk controls and commissioner route.', 2),
  (3, 1, 'Are workable contingencies recorded for severe staffing loss, pandemic, transport disruption and loss of key leaders?', 'Staffing escalation plan, mutual aid, transport alternatives and succession cover.', 3),
  (3, 2, 'Are contingencies recorded for loss of premises, fire, flood, utilities, heating, water and severe weather?', 'Premises response, alternative workplace, utility contacts and emergency procedures.', 3),
  (3, 3, 'Are contingencies recorded for care-system, telephony, internet, cyber and power failure?', 'Downtime procedures, paper records, alternative communications, cyber plan and UPS arrangements.', 3),
  (3, 4, 'Are critical suppliers, medicines, PPE, equipment, fuel and professional dependencies mapped with alternatives?', 'Dependency register, supplier contacts, stock thresholds, service agreements and alternatives.', 3),
  (4, 1, 'Is there a tested staff call tree with acknowledgement, escalation and out-of-hours arrangements?', 'Call-tree exercise, contact acknowledgements, on-call record and unresolved-contact route.', 3),
  (4, 2, 'Are people receiving support and representatives given timely, accessible and proportionate information during disruption?', 'Communication templates, accessible formats, call records and feedback.', 3),
  (4, 3, 'Are commissioner, local-authority, safeguarding, NHS, emergency-service and CQC notification routes defined where applicable?', 'Partner contact schedule, notification decision guide, submissions and correspondence.', 3),
  (4, 4, 'Are confidentiality, media handling, information-sharing and communication approval responsibilities controlled?', 'Communication protocol, privacy controls, approved messages and spokesperson arrangements.', 2),
  (5, 1, 'Can staff obtain the minimum current care, medicines, risk, contact and visit information needed for safe continuity?', 'Downtime record pack, synchronisation check, emergency access and sample recovery test.', 3),
  (5, 2, 'Are backups protected, monitored and restored through a documented test rather than assumed to work?', 'Backup monitoring, restore test, exceptions, recovery time and management approval.', 3),
  (5, 3, 'Are manual records reconciled securely back into controlled systems after recovery with omissions and duplicates checked?', 'Reconciliation procedure, completed example, exception report and sign-off.', 3),
  (5, 4, 'Do cyber-incident arrangements cover isolation, specialist support, breach assessment, notifications and safe restoration?', 'Cyber response plan, supplier/SLA contacts, breach decision record and recovery approval.', 3),
  (6, 1, 'Has the plan been exercised within the required frequency using a realistic scenario that tests decisions and safe-care continuity?', 'Exercise brief, participants, injects, observation notes, timings and outcome.', 3),
  (6, 2, 'Do exercise or activation records show decisions, communications, service impact, missed or changed care and immediate controls?', 'Activation timeline, decision log, communication log, incident records and impact assessment.', 3),
  (6, 3, 'Are lessons converted into specific actions with owners, target dates, evidence requirements and management oversight?', 'Debrief, improvement plan, Action Tracker records and oversight assignment.', 3),
  (6, 4, 'Are plan updates, staff communication, competency checks and retesting completed and verified for sustained improvement?', 'Updated plan, read-and-understood evidence, competency checks, retest and effectiveness review.', 3)
)
INSERT INTO "AuditQuestion" (
  "id", "sectionId", "text", "guidance", "evidenceExpected", "responseType", "options",
  "weighting", "mandatory", "requiresCommentNonCompliant", "requiresEvidence", "sortOrder"
)
SELECT
  md5('audit-bcp-v2-question:' || questions.section_order || ':' || questions.sort_order)::uuid,
  md5('audit-bcp-v2-section:' || questions.section_order)::uuid,
  questions.question,
  'Test the control using a current record, direct check or recent exercise. Record the exact source reference, result, any limitation and required action. Do not use people''s names.',
  questions.evidence,
  'COMPLIANCE',
  ARRAY[]::TEXT[],
  questions.weighting,
  true,
  true,
  true,
  questions.sort_order
FROM questions
ON CONFLICT ("sectionId", "sortOrder") DO UPDATE SET
  "text" = EXCLUDED."text",
  "guidance" = EXCLUDED."guidance",
  "evidenceExpected" = EXCLUDED."evidenceExpected",
  "weighting" = EXCLUDED."weighting",
  "mandatory" = true,
  "requiresCommentNonCompliant" = true,
  "requiresEvidence" = true;
