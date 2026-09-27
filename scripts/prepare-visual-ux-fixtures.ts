import { Client, type QueryResultRow } from "pg";

type Setup = {
  actions: Record<string, { id: string }>;
  incidents: Record<string, { id: string }>;
  complaints: Record<string, { id: string }>;
  safeguarding: Record<string, { id: string }>;
  evidenceId: string;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for visual E2E fixtures.");
const db = new Client({ connectionString });
await db.connect();

try {
  const mode = process.argv[2];
  if (mode === "restore") {
    await restoreFixtureReferences();
  } else if (mode === "prepare" && process.argv[3]) {
    const setup = JSON.parse(Buffer.from(process.argv[3], "base64url").toString("utf8")) as Setup;
    process.stdout.write(JSON.stringify(await prepareVisualData(setup)));
  } else {
    throw new Error("Expected restore or prepare with an encoded setup payload.");
  }
} finally {
  await db.end();
}

async function prepareVisualData(setup: Setup) {
  await db.query("BEGIN");
  try {
    const organisation = await one<{ id: string }>('SELECT id FROM "Organisation" WHERE slug = $1', ["meadow-view-home-care"]);
    const guildford = await one<{ id: string }>('SELECT id FROM "ServiceLocation" WHERE "organisationId" = $1 AND code = $2', [organisation.id, "GUILDFORD"]);
    const registeredManager = await one<{ id: string }>('SELECT id FROM "User" WHERE email = $1', ["e2e-rm@release-gate.invalid"]);
    await db.query('UPDATE "User" SET name = $1, "updatedAt" = now() WHERE id = $2', ["Blair Morgan — Registered Manager", registeredManager.id]);
    await db.query('UPDATE "Organisation" SET name = $1, "updatedAt" = now() WHERE id = $2', ["Meadow View Home Care — Demonstration", organisation.id]);

    const client = await one<{ id: string }>(
      'UPDATE "Client" SET "firstName"=$1, "preferredName"=$2, "lastName"=$3, "clientReference"=$4, phone=$5, email=$6, "communicationSummary"=$7, "nextOfKinName"=$8, "nextOfKinRelationship"=$9, "nextOfKinPhone"=$10, "nextOfKinContactAllowed"=true, "updatedAt"=now() WHERE "organisationId"=$11 AND "clientReference"=$12 RETURNING id',
      ["Margaret", "Margaret", "Bennett", "CLI-1042", "07000 410 422", "margaret.bennett@example.invalid", "Prefers clear spoken explanations and written confirmation for material care changes.", "Helen Bennett", "Daughter", "07000 410 423", organisation.id, "E2E-CLI-0001"],
    );
    const staff = await one<{ id: string }>(
      'UPDATE "StaffMember" SET "firstName"=$1, "preferredName"=$2, "lastName"=$3, "employeeReference"=$4, "jobTitle"=$5, department=$6, "workEmail"=$7, "workPhone"=$8, "updatedAt"=now() WHERE "organisationId"=$9 AND "employeeReference"=$10 RETURNING id',
      ["Sarah", "Sarah", "Bennett", "STF-0218", "Senior Care Coordinator", "Quality and Care", "sarah.bennett@example.invalid", "07000 510 218", organisation.id, "E2E-STF-0001"],
    );

    await updateRegister(setup.incidents["E2E-INC-READY"].id, "INC-2026-0214", "Medication support delay during evening call", "A delayed medicines prompt was investigated and the follow-up control now requires assurance.", client.id, staff.id);
    await updateRegister(setup.incidents["E2E-INC-BLOCKED"].id, "INC-2026-0217", "Missed escalation following mobility change", null, client.id);
    await updateRegister(setup.complaints["E2E-CMP-READY"].id, "CMP-2026-0182", "Family concern about continuity and communication", "The investigation and remedy are complete and await management assurance.", client.id);
    await updateRegister(setup.complaints["E2E-CMP-OVERDUE"].id, "CMP-2026-0186", "Response overdue for missed communication updates");
    await updateRegister(setup.safeguarding["E2E-SG-READY"].id, "SG-2026-0031", "Missed wellbeing check and delayed escalation", "Immediate safety was secured; the protection Action and Evidence are ready for management assurance.", client.id, staff.id);
    await updateRegister(setup.safeguarding["E2E-SG-BLOCKED"].id, "SG-2026-0033", "Protection Action remains outstanding", null, client.id);
    await updateRegister(setup.safeguarding["E2E-SG-CRITICAL"].id, "SG-2026-0035", "Serious safeguarding concern requiring separate authority", null, client.id);
    await updateRegister(setup.safeguarding["E2E-SG-OVERDUE"].id, "SG-2026-0038", "Local authority safeguarding response overdue", null, client.id);

    await updateAction(setup.actions["E2E-ACT-ASSURANCE-HIGH"].id, "ACT-2026-0142", "Implement medicines escalation control", "Implement the revised escalation control and submit completion Evidence for independent verification.", -4, client.id, null);
    await updateAction(setup.actions["E2E-ACT-ASSURANCE-INEFFECTIVE"].id, "ACT-2026-0145", "Review sustained medicines improvement", "Completion is verified; determine whether the revised medicines control prevented recurrence.", 3, null, staff.id);
    await updateAction(setup.actions["E2E-ACT-ASSURANCE-LOW"].id, "ACT-2026-0148", "Approve updated governance index", null, 6, null, null);

    await db.query('UPDATE "Evidence" SET title=$1, "sourceReference"=$2, "sourceName"=$3, "relatedModule"=$4, "relatedRecordId"=$5, "locationId"=$6, "evidenceDate"=now() - interval \'18 days\', "updatedAt"=now() WHERE id=$7', ["Medication governance audit — July 2026", "AUD-MED-2026-07", "Monthly medicines quality audit", "Client", client.id, guildford.id, setup.evidenceId]);

    await db.query('INSERT INTO "CarePlan" (id,"organisationId","locationId","clientId",reference,status,"overallRisk","effectiveDate","nextReviewDate","registeredManagerId","serviceType","createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,\'REVIEW_OVERDUE\',\'HIGH\',now()-interval \'190 days\',now()-interval \'9 days\',$5,$6,now(),now()) ON CONFLICT ("organisationId",reference) DO UPDATE SET "clientId"=excluded."clientId","locationId"=excluded."locationId",status=excluded.status,"overallRisk"=excluded."overallRisk","effectiveDate"=excluded."effectiveDate","nextReviewDate"=excluded."nextReviewDate","registeredManagerId"=excluded."registeredManagerId","archivedAt"=NULL,"updatedAt"=now()', [organisation.id, guildford.id, client.id, "CP-2026-1042", registeredManager.id, "Home care"]);

    await db.query('DELETE FROM "StaffComplianceRecord" WHERE "staffMemberId"=$1', [staff.id]);
    const compliance = [
      ["TRAINING", "Safeguarding Adults Level 2", "TRN-SG-218", -370, -5, null, "VALID", "Learning and Development", "Renewal has been assigned and is awaiting completion."],
      ["COMPETENCY", "Medication support competency", "CMP-MED-218", -45, null, 45, "COMPETENT", "Registered Manager", null],
      ["SUPERVISION", "Quality and practice supervision", "SUP-218-06", -110, null, -12, "VALID", "Registered Manager", "Supervision is overdue and requires rebooking."],
      ["APPRAISAL", "Annual appraisal", "APP-218-26", -300, null, 28, "VALID", "Registered Manager", null],
    ] as const;
    for (const [type, title, reference, completedOffset, expiryOffset, dueOffset, outcome, assessor, notes] of compliance) {
      await db.query('INSERT INTO "StaffComplianceRecord" (id,"organisationId","staffMemberId",type,title,reference,"completedDate","expiryDate","nextDueDate",outcome,assessor,"verifiedById","verifiedAt",notes,"createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,now()+($6*interval \'1 day\'),CASE WHEN $7::int IS NULL THEN NULL ELSE now()+($7*interval \'1 day\') END,CASE WHEN $8::int IS NULL THEN NULL ELSE now()+($8*interval \'1 day\') END,$9,$10,$11,now()+($6*interval \'1 day\'),$12,now(),now())', [organisation.id, staff.id, type, title, reference, completedOffset, expiryOffset, dueOffset, outcome, assessor, registeredManager.id, notes]);
    }

    await db.query('DELETE FROM "Evidence" WHERE "organisationId"=$1 AND "sourceReference"=$2', [organisation.id, "STF-ASSURANCE-218"]);
    await db.query('INSERT INTO "Evidence" (id,"organisationId","locationId",title,description,category,"evidenceType","currentnessMode","currentnessStatus","ownerId","evidenceDate","reviewExpiryDate","relatedModule","relatedRecordId","sourceType","sourceName","sourceReference",status,"uploadedById","createdAt","updatedAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,\'EXPIRY_BASED\',\'CURRENT\',$7,now()-interval \'45 days\',now()+interval \'45 days\',$8,$9,\'INTERNAL_RECORD\',$10,$11,\'ACTIVE\',$7,now(),now())', [organisation.id, guildford.id, "Medication competency observation — Sarah Bennett", "Observed-practice record supporting the current medication competency decision.", "Workforce", "Competency", registeredManager.id, "StaffMember", staff.id, "Workforce assurance review", "STF-ASSURANCE-218"]);

    await db.query("COMMIT");
    return { clientId: client.id, staffId: staff.id };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}

async function restoreFixtureReferences() {
  const organisationResult = await db.query<{ id: string }>('SELECT id FROM "Organisation" WHERE slug=$1', ["meadow-view-home-care"]);
  const organisation = organisationResult.rows[0];
  if (!organisation) return;
  const pairs = [
    ["INC-2026-0214", "E2E-INC-READY"], ["INC-2026-0217", "E2E-INC-BLOCKED"], ["INC-2026-0221", "E2E-INC-CRITICAL"],
    ["CMP-2026-0182", "E2E-CMP-READY"], ["CMP-2026-0186", "E2E-CMP-OVERDUE"],
    ["SG-2026-0031", "E2E-SG-READY"], ["SG-2026-0033", "E2E-SG-BLOCKED"], ["SG-2026-0035", "E2E-SG-CRITICAL"], ["SG-2026-0038", "E2E-SG-OVERDUE"],
  ];
  for (const [visual, fixture] of pairs) {
    await db.query('UPDATE "RegisterEntry" SET reference=$1,"updatedAt"=now() WHERE "organisationId"=$2 AND reference=$3 AND NOT EXISTS (SELECT 1 FROM "RegisterEntry" WHERE "organisationId"=$2 AND reference=$1)', [fixture, organisation.id, visual]);
  }
  for (const [visual, fixture] of [["ACT-2026-0142", "E2E-ACT-ASSURANCE-HIGH"], ["ACT-2026-0145", "E2E-ACT-ASSURANCE-INEFFECTIVE"], ["ACT-2026-0148", "E2E-ACT-ASSURANCE-LOW"]]) {
    await db.query('UPDATE "Action" SET reference=$1,"updatedAt"=now() WHERE "organisationId"=$2 AND reference=$3 AND NOT EXISTS (SELECT 1 FROM "Action" WHERE "organisationId"=$2 AND reference=$1)', [fixture, organisation.id, visual]);
  }
  await db.query('UPDATE "Client" SET "clientReference"=$1,"updatedAt"=now() WHERE "organisationId"=$2 AND "clientReference"=$3 AND NOT EXISTS (SELECT 1 FROM "Client" WHERE "organisationId"=$2 AND "clientReference"=$1)', ["E2E-CLI-0001", organisation.id, "CLI-1042"]);
  await db.query('UPDATE "StaffMember" SET "employeeReference"=$1,"updatedAt"=now() WHERE "organisationId"=$2 AND "employeeReference"=$3 AND NOT EXISTS (SELECT 1 FROM "StaffMember" WHERE "organisationId"=$2 AND "employeeReference"=$1)', ["E2E-STF-0001", organisation.id, "STF-0218"]);
  await db.query('UPDATE "Evidence" SET "sourceReference"=$1,"locationId"=NULL,"updatedAt"=now() WHERE "organisationId"=$2 AND "sourceReference"=$3', ["E2E-SRC-001", organisation.id, "AUD-MED-2026-07"]);
}

async function updateRegister(id: string, reference: string, title: string, summary?: string | null, clientId?: string | null, staffMemberId?: string | null) {
  await db.query('UPDATE "RegisterEntry" SET reference=$1,title=$2,summary=COALESCE($3,summary),"clientId"=COALESCE($4,"clientId"),"staffMemberId"=COALESCE($5,"staffMemberId"),"updatedAt"=now() WHERE id=$6', [reference, title, summary ?? null, clientId ?? null, staffMemberId ?? null, id]);
}

async function updateAction(id: string, reference: string, title: string, description: string | null, dueOffset: number, clientId: string | null, staffMemberId: string | null) {
  await db.query('UPDATE "Action" SET reference=$1,title=$2,description=COALESCE($3,description),"dueDate"=now()+($4*interval \'1 day\'),"clientId"=COALESCE($5,"clientId"),"staffMemberId"=COALESCE($6,"staffMemberId"),"updatedAt"=now() WHERE id=$7', [reference, title, description, dueOffset, clientId, staffMemberId, id]);
}

async function one<T extends QueryResultRow>(query: string, values: unknown[]) {
  const result = await db.query<T>(query, values);
  if (!result.rows[0]) throw new Error(`Visual fixture query returned no row: ${query}`);
  return result.rows[0];
}
