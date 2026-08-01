INSERT INTO "RegisterDefinition" (
  "id", "organisationId", "key", "name", "description", "fieldSchema", "isPublished", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  'c4111090-2f3d-4e61-9b8a-1af604163101',
  NULL,
  'call-log',
  'Call Log',
  'Structured inbound and outbound call records, decisions, follow-up and escalation.',
  '[
    {"key":"direction","label":"Call direction","type":"select","required":true,"options":["Inbound","Outbound"]},
    {"key":"callTime","label":"Call time","type":"text","required":true},
    {"key":"method","label":"Contact method","type":"select","required":true,"options":["Telephone","Video call","Voicemail"]},
    {"key":"contactType","label":"Who was involved?","type":"select","required":true,"options":["Person receiving care","Relative, carer or representative","Staff member","Health professional","Commissioner or local authority","CQC or regulator","Supplier or other"]},
    {"key":"personReference","label":"Person or staff reference","type":"text","required":false},
    {"key":"subject","label":"Call subject","type":"select","required":true,"options":["Care delivery","Medication","Safeguarding","Complaint or concern","Staffing","Visit scheduling","Hospital or health professional","Commissioner or contract","General enquiry"]},
    {"key":"callerRole","label":"Caller or recipient role","type":"text","required":false},
    {"key":"outcome","label":"Decision or outcome","type":"textarea","required":true},
    {"key":"followUpRequired","label":"Follow-up required?","type":"boolean","required":true},
    {"key":"followUpBy","label":"Follow-up due date","type":"date","required":false},
    {"key":"escalatedTo","label":"Escalated to","type":"text","required":false},
    {"key":"confidentiality","label":"Confidentiality","type":"select","required":true,"options":["Internal","Confidential","Restricted"]}
  ]'::jsonb,
  TRUE,
  185,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
