UPDATE "KpiDefinition"
SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('missed-visits','late-visits','complaints','safeguarding-referrals');

DELETE FROM "KpiDefinition" WHERE "slug" IN (
  'continuity-of-care','visits-within-agreed-time','outcomes-achieved','care-plan-involvement',
  'incidents-resulting-in-harm','incident-learning-completion','duty-of-candour-on-time',
  'mar-audit-compliance','medicines-competency-compliance','infection-prevention-compliance',
  'care-transitions-on-time','dbs-compliance','right-to-work-compliance','professional-registration-compliance',
  'competency-compliance','complaints-responded-on-time','complaint-actions-completed','feedback-response-rate',
  'carer-satisfaction','statutory-notifications-on-time','business-continuity-test-compliance',
  'information-governance-training','data-quality-compliance','data-breaches','equality-actions-completed'
);
