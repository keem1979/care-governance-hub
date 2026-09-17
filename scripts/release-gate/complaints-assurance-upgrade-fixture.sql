\set ON_ERROR_STOP on

INSERT INTO "Organisation" (id,name,slug,"updatedAt") VALUES
('11000000-0000-4000-8000-000000000001','Complaint Upgrade Care Ltd','complaint-upgrade-care','2026-08-20T10:00:00Z');

INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES
('11000000-0000-4000-8000-000000000002','complaint-upgrade@example.invalid','Complaint Upgrade Manager','not-a-login-credential','2026-08-20T10:00:00Z');

INSERT INTO "ServiceLocation" (id,"organisationId",name,code,"updatedAt") VALUES
('11000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001','Complaint Upgrade Service','CMP-UPGRADE','2026-08-20T10:00:00Z');

INSERT INTO "RegisterEntry" (
  id,"organisationId","definitionId","locationId",reference,"eventDate",title,summary,
  "riskLevel",status,"ownerId",data,"createdById","updatedAt"
)
SELECT
  '11000000-0000-4000-8000-000000000090','11000000-0000-4000-8000-000000000001',id,
  '11000000-0000-4000-8000-000000000003','CMP-LEGACY-001','2026-08-20T09:00:00Z',
  'Historical complaint retained through assurance upgrade',
  'Historical fictional Complaint captured before the closed-loop assurance migration.',
  'HIGH','IN_REVIEW','11000000-0000-4000-8000-000000000002',
  '{"complainantFirstName":"Fictional Pat","category":"Care quality","investigator":"Legacy Manager","acknowledgementDate":"2026-08-21","targetResponseDate":"2026-09-10","outcome":"Legacy outcome retained.","dutyOfCandour":true,"externalReferral":false,"learning":"Legacy learning retained."}'::jsonb,
  '11000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z'
FROM "RegisterDefinition" WHERE key='complaints' AND "organisationId" IS NULL;
