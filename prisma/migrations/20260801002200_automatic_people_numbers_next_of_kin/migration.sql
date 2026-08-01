CREATE TABLE "ReferenceCounter" (
  "id" UUID NOT NULL,
  "organisationId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReferenceCounter_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReferenceCounter_organisationId_key_key" ON "ReferenceCounter"("organisationId", "key");
CREATE INDEX "ReferenceCounter_organisationId_idx" ON "ReferenceCounter"("organisationId");

ALTER TABLE "Client" ADD COLUMN "clientNumber" INTEGER;
ALTER TABLE "Client" ADD COLUMN "nextOfKinName" TEXT;
ALTER TABLE "Client" ADD COLUMN "nextOfKinRelationship" TEXT;
ALTER TABLE "Client" ADD COLUMN "nextOfKinPhone" TEXT;
ALTER TABLE "Client" ADD COLUMN "nextOfKinEmail" TEXT;
ALTER TABLE "Client" ADD COLUMN "nextOfKinAddress" TEXT;
ALTER TABLE "Client" ADD COLUMN "nextOfKinContactAllowed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "nextOfKinHasAuthority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "nextOfKinAuthorityDetails" TEXT;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "organisationId" ORDER BY "createdAt", "id")::INTEGER AS number
  FROM "Client"
)
UPDATE "Client" AS client SET "clientNumber" = numbered.number FROM numbered WHERE client."id" = numbered."id";
ALTER TABLE "Client" ALTER COLUMN "clientNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Client_organisationId_clientNumber_key" ON "Client"("organisationId", "clientNumber");

ALTER TABLE "StaffMember" ADD COLUMN "staffNumber" INTEGER;
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "organisationId" ORDER BY "createdAt", "id")::INTEGER AS number
  FROM "StaffMember"
)
UPDATE "StaffMember" AS staff SET "staffNumber" = numbered.number FROM numbered WHERE staff."id" = numbered."id";
ALTER TABLE "StaffMember" ALTER COLUMN "staffNumber" SET NOT NULL;
CREATE UNIQUE INDEX "StaffMember_organisationId_staffNumber_key" ON "StaffMember"("organisationId", "staffNumber");

INSERT INTO "ReferenceCounter" ("id", "organisationId", "key", "currentValue", "updatedAt")
SELECT gen_random_uuid(), organisation."id", 'CLIENT', COALESCE(MAX(client."clientNumber"), 0), CURRENT_TIMESTAMP
FROM "Organisation" AS organisation LEFT JOIN "Client" AS client ON client."organisationId" = organisation."id"
GROUP BY organisation."id";

INSERT INTO "ReferenceCounter" ("id", "organisationId", "key", "currentValue", "updatedAt")
SELECT gen_random_uuid(), organisation."id", 'STAFF', COALESCE(MAX(staff."staffNumber"), 0), CURRENT_TIMESTAMP
FROM "Organisation" AS organisation LEFT JOIN "StaffMember" AS staff ON staff."organisationId" = organisation."id"
GROUP BY organisation."id";
