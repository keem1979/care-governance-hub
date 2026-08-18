import { createHash } from "node:crypto";

export type IdentityRecord = {
  id: string;
  organisationId: string;
  locationId?: string | null;
  entityType: "CLIENT" | "STAFF_MEMBER";
  reference: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  email?: string | null;
  phone?: string | null;
  nationalIdentifier?: string | null;
};

export type IdentityAnomaly = {
  organisationId: string;
  locationId: string | null;
  entityType: IdentityRecord["entityType"];
  fingerprint: string;
  candidateRecordIds: string[];
  candidateLabels: string[];
  matchSignals: string[];
  summary: string;
};

export function findIdentityAnomalies(records: IdentityRecord[]): IdentityAnomaly[] {
  const grouped = new Map<string, IdentityRecord[]>();
  for (const record of records) {
    const key = `${record.organisationId}:${record.entityType}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  return [...grouped.values()].flatMap((items) => {
    const cases: IdentityAnomaly[] = [];
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex];
        const right = items[rightIndex];
        const signals = matchSignals(left, right);
        if (!isReviewable(signals)) continue;
        const candidateRecordIds = [left.id, right.id].sort();
        cases.push({
          organisationId: left.organisationId,
          locationId: left.locationId === right.locationId ? left.locationId ?? null : null,
          entityType: left.entityType,
          fingerprint: fingerprint(left.organisationId, left.entityType, candidateRecordIds),
          candidateRecordIds,
          candidateLabels: [label(left), label(right)],
          matchSignals: signals,
          summary: `${entityLabel(left.entityType)} records may refer to the same person. Human review is required before any merge.`,
        });
      }
    }
    return cases;
  });
}

export function reconciliationReference(sequence: number, now = new Date()) {
  return `DQ-${now.getUTCFullYear()}-${String(sequence).padStart(5, "0")}`;
}

function matchSignals(left: IdentityRecord, right: IdentityRecord): string[] {
  const signals: string[] = [];
  const sameName = normal(left.firstName) === normal(right.firstName) && normal(left.lastName) === normal(right.lastName);
  if (sameName) signals.push("Same full name");
  if (sameName && left.dateOfBirth && right.dateOfBirth && dateKey(left.dateOfBirth) === dateKey(right.dateOfBirth)) signals.push("Same date of birth");
  if (present(left.email) && normal(left.email) === normal(right.email)) signals.push("Same email address");
  if (present(left.phone) && phone(left.phone) === phone(right.phone)) signals.push("Same telephone number");
  if (present(left.nationalIdentifier) && identifier(left.nationalIdentifier) === identifier(right.nationalIdentifier)) signals.push("Same national identifier");
  if (normal(left.reference) === normal(right.reference)) signals.push("Same internal reference");
  return signals;
}

function isReviewable(signals: string[]) {
  return signals.includes("Same national identifier") || signals.includes("Same internal reference") ||
    (signals.includes("Same full name") && signals.some((signal) => signal !== "Same full name"));
}

function fingerprint(organisationId: string, entityType: string, ids: string[]) {
  return createHash("sha256").update(`${organisationId}:${entityType}:${ids.join(":")}`).digest("hex");
}
function label(record: IdentityRecord) { return `${record.firstName} ${record.lastName} · ${record.reference}`; }
function entityLabel(value: IdentityRecord["entityType"]) { return value === "CLIENT" ? "Client" : "Staff"; }
function normal(value: string | null | undefined) { return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " "); }
function phone(value: string | null | undefined) { return String(value ?? "").replace(/[^0-9+]/g, "").replace(/^00/, "+"); }
function identifier(value: string | null | undefined) { return String(value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase(); }
function present(value: string | null | undefined) { return normal(value).length > 0; }
function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
