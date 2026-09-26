import "dotenv/config";
import pg from "pg";
import { E2E_USERS } from "../tests/e2e/fixtures.ts";
import { generateTotp } from "../src/lib/auth/mfa.ts";

const destination = new URL(process.env.DATABASE_URL ?? "");
if (destination.hostname !== "127.0.0.1" || destination.port !== "5432" || destination.pathname !== "/care_governance_hub_test") {
  throw new Error("WP-003B capture gate requires the named disposable local database.");
}
const base = `http://127.0.0.1:${process.env.WP003A_TEST_PORT ?? "3104"}`;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const results = [];
function check(name, condition) {
  results.push({ name, pass: Boolean(condition) });
  if (!condition) throw new Error(`${name} failed.`);
}
async function login(user = E2E_USERS.riskOwner) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: user.password, mfaCode: generateTotp(user.mfaSecret) }) });
  if (response.status !== 200) throw new Error(`Fictional sign-in failed (${response.status}).`);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Fictional authenticated cookie missing.");
  return cookie;
}
async function post(cookie, key, data) {
  const response = await fetch(`${base}/api/registers/${key}`, { method: "POST", headers: { Cookie: cookie }, body: new URLSearchParams(data) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}
async function search(cookie, params) {
  const response = await fetch(`${base}/api/registers/authorised-options?${new URLSearchParams(params)}`, { headers: { Cookie: cookie } });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

await db.connect();
try {
  const cookie = await login();
  const restricted = await login(E2E_USERS.locationRestricted);
  const client = (await db.query('SELECT id FROM "Client" WHERE "clientReference"=$1', ["E2E-CLI-0001"])).rows[0];
  if (!client) throw new Error("Fictional Client fixture missing.");
  const staff = (await db.query('SELECT id FROM "StaffMember" WHERE "employeeReference"=$1', ["E2E-STF-0001"])).rows[0];
  if (!staff) throw new Error("Fictional Staff fixture missing.");
  const guildford = (await db.query('SELECT id FROM "ServiceLocation" WHERE code=$1', ["GUILDFORD"])).rows[0];
  if (!guildford) throw new Error("Fictional Guildford location missing.");
  const ownerSearch = await search(cookie, { kind: "CLIENT", q: "Cam Fictional" });
  check("authorised full-name Client search", ownerSearch.status === 200 && ownerSearch.body.items?.some((item) => item.id === client.id));
  const restrictedSearch = await search(restricted, { kind: "CLIENT", q: "Cam Fictional" });
  check("restricted Client search excludes another location", restrictedSearch.status === 200 && !restrictedSearch.body.items?.some((item) => item.id === client.id));
  check("restricted forged location search rejected", (await search(restricted, { kind: "CLIENT", q: "Cam", locationId: guildford.id })).status === 403);
  const staffSearch = await search(cookie, { kind: "STAFF", q: "Taylor Fictional" });
  check("authorised full-name Staff search", staffSearch.status === 200 && staffSearch.body.items?.some((item) => item.id === staff.id));
  const restrictedStaffSearch = await search(restricted, { kind: "STAFF", q: "Taylor Fictional" });
  check("restricted Staff search excludes another location", restrictedStaffSearch.status === 200 && !restrictedStaffSearch.body.items?.some((item) => item.id === staff.id));
  check("restricted forged Staff location rejected", (await search(restricted, { kind: "STAFF", q: "Taylor", locationId: guildford.id })).status === 403);
  check("unsupported search kind rejected", (await search(cookie, { kind: "EVIDENCE", q: "Cam" })).status === 400);
  const captures = [
    ["incidents", { summary: "Fictional WP003B minimum Incident capture.", field_incidentType: "Care delivery", field_harmLevel: "Unknown / evidence required" }],
    ["complaints", { summary: "Fictional WP003B minimum Complaint capture.", field_immediateSafetyConcern: "Unknown / evidence required" }],
    ["safeguarding", { summary: "Fictional WP003B minimum Safeguarding capture.", clientId: client.id, field_safetyPosition: "Unknown / evidence required" }],
  ];
  for (const [key, input] of captures) {
    const result = await post(cookie, key, input);
    check(`${key} minimum POST`, result.status === 201 && Boolean(result.body.id));
    const record = (await db.query('SELECT e.*, d.key FROM "RegisterEntry" e JOIN "RegisterDefinition" d ON d.id=e."definitionId" WHERE e.id=$1', [result.body.id])).rows[0];
    check(`${key} canonical record`, record?.key === key && record.summary === input.summary && record.title.length >= 3);
    check(`${key} open and unassessed`, record?.status === "OPEN" && record.riskLevel === "UNASSESSED" && record.closureDate === null);
    check(`${key} attributable owner`, Boolean(record?.createdById) && record.ownerId === record.createdById);
    const history = (await db.query('SELECT count(*)::int AS n FROM "RegisterEntryHistory" WHERE "entryId"=$1 AND action=$2', [record.id, "CREATED"])).rows[0].n;
    const activity = (await db.query('SELECT count(*)::int AS n FROM "ActivityLog" WHERE "recordType"=$1 AND "recordId"=$2 AND action=$3', ["RegisterEntry", record.id, "CREATE"])).rows[0].n;
    check(`${key} history and ActivityLog`, history === 1 && activity === 1);
    const evidence = (await db.query('SELECT count(*)::int AS n FROM "Evidence" WHERE "relatedModule"=$1 AND "relatedRecordId"=$2 AND "sourceType"=$3', ["RegisterEntry", record.id, "INTERNAL_RECORD"])).rows[0].n;
    check(`${key} one canonical Evidence`, evidence === 1);
    if (key === "complaints") {
      const investigation = (await db.query('SELECT status, category FROM "ComplaintInvestigation" WHERE "complaintId"=$1', [record.id])).rows[0];
      check("Complaint follow-up remains open", Boolean(investigation) && investigation.category === null);
    }
    if (key === "safeguarding") {
      const caseRecord = (await db.query('SELECT status, "safetyPosition", "referralDecision" FROM "SafeguardingCase" WHERE "safeguardingId"=$1', [record.id])).rows[0];
      check("Safeguarding Client and follow-up", record.clientId === client.id && caseRecord?.safetyPosition === "UNKNOWN_EVIDENCE_REQUIRED" && caseRecord.referralDecision === "AWAITING_DECISION");
    }
  }
  check("missing Safeguarding Client rejected", (await post(cookie, "safeguarding", { summary: "Fictional missing person.", field_safetyPosition: "Unknown / evidence required" })).status === 400);
  check("missing Incident type rejected", (await post(cookie, "incidents", { summary: "Fictional missing type.", field_harmLevel: "Unknown / evidence required" })).status === 400);
  check("missing Complaint safety rejected", (await post(cookie, "complaints", { summary: "Fictional missing safety." })).status === 400);
  check("controlled Safeguarding without action rejected", (await post(cookie, "safeguarding", { summary: "Fictional controlled risk.", clientId: client.id, field_safetyPosition: "Immediate risk controlled" })).status === 400);
  check("forged closed status rejected", (await post(cookie, "incidents", { summary: "Fictional forged closure.", field_incidentType: "Care delivery", field_harmLevel: "Unknown / evidence required", status: "CLOSED" })).status === 400);
  console.log(`WP003B_CAPTURE_GATE ${results.length}/${results.length} PASS`);
  for (const result of results) console.log(`${result.name}: PASS`);
} finally { await db.end(); }
