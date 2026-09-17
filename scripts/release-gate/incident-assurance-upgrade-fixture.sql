\set ON_ERROR_STOP on

INSERT INTO "Organisation" (id,name,slug,"updatedAt") VALUES
('10000000-0000-4000-8000-000000000001','Incident Upgrade Care Ltd','incident-upgrade-care','2026-08-20T10:00:00Z');

INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES
('10000000-0000-4000-8000-000000000002','incident-upgrade@example.invalid','Incident Upgrade Manager','not-a-login-credential','2026-08-20T10:00:00Z');

INSERT INTO "ServiceLocation" (id,"organisationId",name,code,"updatedAt") VALUES
('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Incident Upgrade Service','INC-UPGRADE','2026-08-20T10:00:00Z');

INSERT INTO "RegisterEntry" (
  id,"organisationId","definitionId","locationId",reference,"eventDate",title,summary,
  "riskLevel",status,"ownerId",data,"createdById","updatedAt"
)
SELECT
  '10000000-0000-4000-8000-000000000090','10000000-0000-4000-8000-000000000001',id,
  '10000000-0000-4000-8000-000000000003','INC-LEGACY-001','2026-08-20T09:00:00Z',
  'Historical incident retained through assurance upgrade',
  'Historical fictional Incident captured before the closed-loop assurance migration.',
  'HIGH','IN_REVIEW','10000000-0000-4000-8000-000000000002',
  '{"incidentType":"Care delivery","immediateResponse":"Immediate support was provided.","harmLevel":"Moderate harm","emergencyServices":false,"safeguardingReferral":false,"cqcNotification":true,"dutyOfCandour":true,"rootCause":"Legacy narrative retained.","learning":"Legacy learning retained."}'::jsonb,
  '10000000-0000-4000-8000-000000000002','2026-08-20T10:00:00Z'
FROM "RegisterDefinition" WHERE key='incidents' AND "organisationId" IS NULL;
