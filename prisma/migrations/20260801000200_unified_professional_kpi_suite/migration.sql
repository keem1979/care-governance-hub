-- These four legacy cards duplicate measures held in the unified monthly operating set.
-- Keep them for audit history but remove them from the active catalogue.
UPDATE "KpiDefinition"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('missed-visits','late-visits','complaints','safeguarding-referrals');

-- Present the supplied monthly tracker as one plain-language operating set, without external codes.
UPDATE "KpiDefinition" AS d
SET "name" = v.name,
    "description" = v.description,
    "sortOrder" = v.sort_order,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('scc-pocs-ended','Packages of care ended','Packages that ended during the reporting month.',1),
  ('scc-pocs-handed-back','Packages handed back','Packages the service could no longer continue during the reporting month.',2),
  ('scc-total-calls','Total care calls delivered','All care calls delivered during the reporting month.',3),
  ('scc-late-calls','Late care calls','Care calls delivered later than the organisation’s agreed tolerance.',4),
  ('scc-missed-calls','Missed care calls','Planned care calls that were not delivered.',5),
  ('scc-rescheduled-calls','Rescheduled care calls','Care calls moved to another agreed time.',6),
  ('scc-provider-cancelled-calls','Calls cancelled by the provider','Planned calls cancelled by the service.',7),
  ('scc-service-user-cancelled-calls','Calls cancelled by the person receiving care','Planned calls cancelled by the person receiving care or their representative.',8),
  ('scc-service-user-cancelled-under24h','Short-notice cancellations','Cancellations made within the organisation’s short-notice period.',9),
  ('scc-restarts-offered','Restarts offered','Offers to restart care following a pause or discharge.',10),
  ('scc-eligible-restarts-taken','Eligible restarts accepted','Eligible restart offers accepted by the service.',11),
  ('scc-referrals-accepted','Referrals accepted','New service referrals accepted during the month.',12),
  ('scc-referrals-rejected','Referrals declined','New service referrals the service could not safely accept.',13),
  ('scc-referrals-positive-response','Referral requests answered positively','Referral requests answered with capacity to support.',14),
  ('scc-referrals-negative-response','Referral requests answered negatively','Referral requests answered without available capacity.',15),
  ('scc-referrals-no-response','Referral requests awaiting a response','Referral requests not answered within the reporting period.',16),
  ('scc-pocs-started','Packages of care started','New packages that started during the reporting month.',17),
  ('scc-pocs-awarded','Packages of care awarded','Packages awarded to the service during the reporting month.',18),
  ('scc-active-pocs-month-end','Active packages at month end','Packages of care active on the final day of the month.',19),
  ('scc-live-in-pocs-ended','Live-in packages ended','Live-in care packages that ended during the month.',20),
  ('scc-live-in-pocs-handed-back','Live-in packages handed back','Live-in packages the service could no longer continue.',21),
  ('scc-live-in-break-periods-delivered','Live-in break periods delivered','Planned live-in care break periods delivered safely.',22),
  ('scc-live-in-break-periods-not-required','Live-in break periods not required','Planned break periods confirmed as not required.',23),
  ('scc-active-live-in-staff','Active live-in care staff','Live-in care staff active at month end.',24),
  ('scc-live-in-staff-supervised','Live-in staff supervised','Active live-in staff who received required supervision.',25),
  ('scc-staff-month-end','Total staff at month end','Directly employed staff active on the final day of the month.',26),
  ('scc-new-direct-care-staff','New direct-care staff','Direct-care staff who joined during the month.',27),
  ('scc-new-back-office-staff','New office and management staff','Office and management staff who joined during the month.',28),
  ('scc-staff-left','Staff who left','Staff whose employment ended during the month.',29),
  ('scc-orientation-eligible','New staff eligible for orientation','New starters who require the organisation’s orientation programme.',30),
  ('scc-orientation-completed','New staff due to complete orientation','New starters due to complete orientation in the reporting month.',31),
  ('scc-care-certificate-valid','Staff with a valid Care Certificate','Active staff whose Care Certificate status is current.',32),
  ('scc-sponsored-staff-surrey','Sponsored staff in active roles','Sponsored staff currently working in active roles.',33),
  ('scc-complaints-received','Complaints received','Formal complaints received during the month.',34),
  ('scc-complaints-upheld','Complaints upheld','Closed complaints where the concern was upheld.',35),
  ('scc-complaints-not-upheld','Complaints not upheld','Closed complaints where the concern was not upheld.',36),
  ('scc-complaints-open','Complaints open or pending','Complaints still being reviewed at month end.',37),
  ('scc-complaints-closed','Complaints closed','Complaints concluded during the reporting month.',38),
  ('scc-safeguarding-referrals','Safeguarding referrals','Safeguarding concerns referred during the month.',39),
  ('scc-section42-enquiries','Safeguarding enquiries','Safeguarding concerns that progressed to a formal enquiry.',40),
  ('scc-section42-risk-present','Safeguarding outcomes: risk identified','Completed enquiries where risk was identified.',41),
  ('scc-section42-no-risk','Safeguarding outcomes: no risk identified','Completed enquiries where no ongoing risk was identified.',42),
  ('scc-section42-open','Safeguarding enquiries open or pending','Formal safeguarding enquiries still open at month end.',43),
  ('scc-call-exception-rate','Care-call exception rate','Calculated percentage of late, missed, rescheduled and cancelled calls.',44),
  ('scc-restart-acceptance-rate','Restart acceptance rate','Calculated percentage of eligible restart offers accepted.',45),
  ('scc-new-staff-rate','New-starter rate','Calculated percentage of active staff who joined during the month.',46),
  ('scc-care-certificate-rate','Care Certificate compliance','Calculated percentage of active staff with a valid Care Certificate.',47),
  ('scc-referral-response-rate','Referral response rate','Calculated percentage of referral requests that received a response.',48)
) AS v(slug,name,description,sort_order)
WHERE d."slug" = v.slug;

-- Reword and order the supporting assurance set below the monthly operating picture.
UPDATE "KpiDefinition" AS d
SET "name" = v.name,
    "description" = v.description,
    "sortOrder" = v.sort_order,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('care-hours-delivered','Care hours delivered','Total commissioned or planned care hours delivered.',101),
  ('medication-errors','Medication errors','Recorded medicines administration or recording errors.',110),
  ('falls','Falls','Falls involving people receiving care.',111),
  ('pressure-damage','New or worsened pressure damage','New or worsened pressure damage identified during care.',112),
  ('hospital-admissions','Unplanned hospital admissions','Unplanned hospital admissions involving people receiving care.',113),
  ('incidents','Care and safety incidents','Recorded incidents affecting care, safety or wellbeing.',114),
  ('near-misses','Near misses','Events that could have caused harm but did not.',115),
  ('risk-assessments-reviewed','Risk assessments reviewed on time','Current risk assessments reviewed within their required timescale.',116),
  ('staff-turnover','Staff turnover','Staff leaving rate over the organisation’s chosen reporting period.',130),
  ('staff-sickness','Staff sickness','Working time lost to staff sickness.',131),
  ('vacancies','Unfilled posts','Approved posts that remain unfilled.',132),
  ('training-compliance','Mandatory training compliance','Active staff current with required mandatory learning.',133),
  ('supervision-compliance','Supervision completed on time','Active staff receiving supervision within the required timescale.',134),
  ('appraisal-compliance','Appraisals completed on time','Active staff receiving an appraisal within the required timescale.',135),
  ('spot-check-compliance','Spot checks completed on time','Required care-practice spot checks completed within the reporting period.',136),
  ('care-plan-reviews','Care plans reviewed on time','Care plans reviewed within the organisation’s required timescale.',150),
  ('service-user-satisfaction','People satisfied with their care','Positive responses from people receiving care.',160),
  ('staff-satisfaction','Staff experience score','Positive responses from staff experience surveys.',161),
  ('compliments','Compliments received','Positive feedback received from people, families or partners.',162),
  ('open-actions','Open improvement actions','Improvement actions not yet completed.',180),
  ('overdue-actions','Overdue improvement actions','Improvement actions that have passed their due date.',181),
  ('audit-completion','Audit programme completion','Planned audits completed within the reporting period.',182),
  ('policy-compliance','Policy review compliance','Controlled policies approved and within their review date.',183)
) AS v(slug,name,description,sort_order)
WHERE d."slug" = v.slug;

-- Additional measures cover current care-quality expectations across outcomes, safety,
-- workforce assurance, feedback, learning, information quality and resilience.
INSERT INTO "KpiDefinition" ("organisationId","name","slug","description","unit","direction","targetValue","greenThreshold","amberThreshold","sortOrder","updatedAt")
SELECT o."id", v.name, v.slug, v.description, v.unit, v.direction::"KpiDirection", v.target, v.green_value, v.amber_value, v.sort_order, CURRENT_TIMESTAMP
FROM "Organisation" o
CROSS JOIN (VALUES
  ('Continuity of care','continuity-of-care','Care calls delivered by staff known to the person receiving care.','%','HIGHER_IS_BETTER',90,90,80,151),
  ('Visits delivered within the agreed time','visits-within-agreed-time','Planned calls delivered within the organisation’s agreed time window.','%','HIGHER_IS_BETTER',95,95,90,152),
  ('Personal outcomes achieved','outcomes-achieved','Reviewed personal outcomes achieved or showing agreed progress.','%','HIGHER_IS_BETTER',90,90,80,153),
  ('People involved in care planning','care-plan-involvement','Current care plans showing meaningful involvement, choice and consent.','%','HIGHER_IS_BETTER',100,100,90,154),
  ('Incidents resulting in harm','incidents-resulting-in-harm','Recorded safety incidents that resulted in harm.','%','LOWER_IS_BETTER',0,0,5,117),
  ('Incident learning reviews completed','incident-learning-completion','Incidents requiring review where learning and improvement actions were documented.','%','HIGHER_IS_BETTER',100,100,90,118),
  ('Duty of candour completed on time','duty-of-candour-on-time','Qualifying incidents where openness and notification steps were completed on time.','%','HIGHER_IS_BETTER',100,100,90,119),
  ('Medication record audit compliance','mar-audit-compliance','Medication records meeting the organisation’s audit standard.','%','HIGHER_IS_BETTER',100,100,90,120),
  ('Medicines competency compliance','medicines-competency-compliance','Staff administering medicines with a current competency assessment.','%','HIGHER_IS_BETTER',100,100,90,121),
  ('Infection prevention audit compliance','infection-prevention-compliance','Infection prevention controls meeting the organisation’s audit standard.','%','HIGHER_IS_BETTER',100,100,90,122),
  ('Care transitions completed on time','care-transitions-on-time','Admissions, discharges or transfers completed within the agreed timeframe with required information shared.','%','HIGHER_IS_BETTER',95,95,85,123),
  ('DBS compliance','dbs-compliance','Relevant staff with the required current DBS status and documented checks.','%','HIGHER_IS_BETTER',100,100,95,137),
  ('Right-to-work compliance','right-to-work-compliance','Active staff with a valid and evidenced right-to-work check.','%','HIGHER_IS_BETTER',100,100,95,138),
  ('Professional registration compliance','professional-registration-compliance','Staff in regulated roles with a current professional registration.','%','HIGHER_IS_BETTER',100,100,95,139),
  ('Staff competency compliance','competency-compliance','Required role-specific competencies assessed and current.','%','HIGHER_IS_BETTER',100,100,90,140),
  ('Complaints responded to on time','complaints-responded-on-time','Complaints receiving a full response within the organisation’s published timescale.','%','HIGHER_IS_BETTER',100,100,90,163),
  ('Complaint improvement actions completed','complaint-actions-completed','Improvement actions arising from complaints completed by their due date.','%','HIGHER_IS_BETTER',100,100,90,164),
  ('Feedback response rate','feedback-response-rate','People or representatives invited to give feedback who responded.','%','HIGHER_IS_BETTER',60,60,40,165),
  ('Carer and family satisfaction','carer-satisfaction','Positive responses from carers, families or representatives.','%','HIGHER_IS_BETTER',90,90,80,166),
  ('Required notifications submitted on time','statutory-notifications-on-time','Required external notifications submitted accurately within the expected timeframe.','%','HIGHER_IS_BETTER',100,100,90,184),
  ('Business continuity exercises completed','business-continuity-test-compliance','Planned continuity and emergency exercises completed with learning recorded.','%','HIGHER_IS_BETTER',100,100,90,185),
  ('Information governance training compliance','information-governance-training','Active staff current with required information governance and data security learning.','%','HIGHER_IS_BETTER',100,100,90,186),
  ('Record quality compliance','data-quality-compliance','Sampled care and governance records meeting completeness, accuracy and timeliness standards.','%','HIGHER_IS_BETTER',95,95,85,187),
  ('Data protection incidents','data-breaches','Confirmed personal-data or confidentiality incidents recorded during the month.','count','LOWER_IS_BETTER',0,0,1,188),
  ('Equality improvement actions completed','equality-actions-completed','Agreed actions addressing unequal access, experience or outcomes completed on time.','%','HIGHER_IS_BETTER',100,100,90,189)
) AS v(name,slug,description,unit,direction,target,green_value,amber_value,sort_order)
ON CONFLICT ("organisationId","slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "unit" = EXCLUDED."unit",
    "direction" = EXCLUDED."direction",
    "targetValue" = EXCLUDED."targetValue",
    "greenThreshold" = EXCLUDED."greenThreshold",
    "amberThreshold" = EXCLUDED."amberThreshold",
    "sortOrder" = EXCLUDED."sortOrder",
    "updatedAt" = CURRENT_TIMESTAMP;
