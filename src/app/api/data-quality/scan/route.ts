import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { findIdentityAnomalies, reconciliationReference, type IdentityRecord } from "@/lib/identity-reconciliation";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const db = createDb();
  try {
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id }) => id) } }] };
    const [clients, staff] = await Promise.all([
      db.client.findMany({ where: clientScopeWhere(context), select: { id: true, organisationId: true, locationId: true, clientReference: true, firstName: true, lastName: true, dateOfBirth: true, email: true, phone: true, nhsNumber: true } }),
      db.staffMember.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...locationScope }, select: { id: true, organisationId: true, locationId: true, employeeReference: true, firstName: true, lastName: true, workEmail: true, workPhone: true } }),
    ]);
    const records: IdentityRecord[] = [
      ...clients.map((item) => ({ id: item.id, organisationId: item.organisationId, locationId: item.locationId, entityType: "CLIENT" as const, reference: item.clientReference, firstName: item.firstName, lastName: item.lastName, dateOfBirth: item.dateOfBirth, email: item.email, phone: item.phone, nationalIdentifier: item.nhsNumber })),
      ...staff.map((item) => ({ id: item.id, organisationId: item.organisationId, locationId: item.locationId, entityType: "STAFF_MEMBER" as const, reference: item.employeeReference, firstName: item.firstName, lastName: item.lastName, email: item.workEmail, phone: item.workPhone })),
    ];
    const anomalies = findIdentityAnomalies(records);
    const fingerprints = anomalies.map((item) => item.fingerprint);
    const existing = await db.reconciliationCase.findMany({ where: { organisationId: context.organisation.id, fingerprint: { in: fingerprints } }, select: { fingerprint: true } });
    const existingFingerprints = new Set(existing.map((item) => item.fingerprint));
    const newAnomalies = anomalies.filter((item) => !existingFingerprints.has(item.fingerprint));
    await db.$transaction(async (tx) => {
      for (const anomaly of anomalies.filter((item) => existingFingerprints.has(item.fingerprint))) {
        await tx.reconciliationCase.update({ where: { organisationId_fingerprint: { organisationId: context.organisation.id, fingerprint: anomaly.fingerprint } }, data: { locationId: anomaly.locationId, candidateLabels: anomaly.candidateLabels, matchSignals: anomaly.matchSignals, summary: anomaly.summary } });
      }
      for (const anomaly of newAnomalies) {
        const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "DATA_QUALITY" } }, create: { organisationId: context.organisation.id, key: "DATA_QUALITY", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
        await tx.reconciliationCase.create({ data: { ...anomaly, reference: reconciliationReference(counter.currentValue), reason: "DUPLICATE_IDENTITY" } });
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "DataQuality", recordId: context.organisation.id, summary: `Completed controlled identity scan; ${newAnomalies.length} new case${newAnomalies.length === 1 ? "" : "s"} raised`, afterValue: { recordsChecked: records.length, candidatesFound: anomalies.length, newCases: newAnomalies.length, automaticMerges: 0 } } });
    });
    return NextResponse.json({ recordsChecked: records.length, candidatesFound: anomalies.length, newCases: newAnomalies.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The identity scan could not be completed." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
