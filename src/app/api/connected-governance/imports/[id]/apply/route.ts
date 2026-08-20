import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { formatPersonReference } from "@/lib/people-references";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { syncTrainingMatrixEvidence } from "@/lib/workforce-evidence";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.WORKFORCE_MANAGE]), { id } = await params, db = createDb();
  try {
    const batch = await db.importBatch.findFirst({ where: { id, organisationId: context.organisation.id, status: { in: ["READY_TO_APPLY", "AWAITING_RECONCILIATION", "PARTIALLY_APPLIED", "ANALYSED"] } }, include: { rows: { where: { status: { in: ["READY_TO_CREATE", "EXACT_MATCH"] } }, orderBy: { rowNumber: "asc" } }, connection: true } });
    if (!batch) return NextResponse.json({ error: "Import batch is not available for apply." }, { status: 404 });
    if (batch.target === "STAFF_MEMBER" && !hasPermission(context.permissions, PERMISSIONS.WORKFORCE_MANAGE)) throw new Error("Workforce management permission is required to apply staff imports.");
    if (!batch.rows.length) throw new Error("No reviewed rows are ready to apply.");
    const locations = await db.serviceLocation.findMany({ where: { organisationId: context.organisation.id, id: { in: context.locations.map((item) => item.id) }, isActive: true, archivedAt: null }, select: { id: true, code: true } }), locationByCode = new Map(locations.map((item) => [item.code.toLowerCase(), item.id]));
    const result = await db.$transaction(async (tx) => {
      let createdCount = 0, linkedCount = 0;
      const coreCourses = batch.target === "STAFF_MEMBER" ? await tx.trainingCourse.findMany({ where: { organisationId: null, serviceSpecific: false, archivedAt: null }, select: { id: true } }) : [];
      for (const row of batch.rows) {
        if (row.status === "EXACT_MATCH") { await tx.importRow.update({ where: { id: row.id }, data: { status: "LINKED_NO_CHANGE", appliedById: context.user.id, appliedAt: new Date() } }); linkedCount += 1; continue; }
        const locationId = row.locationCode ? locationByCode.get(row.locationCode.toLowerCase()) ?? null : batch.locationId;
        if (row.locationCode && !locationId) continue;
        const counterKey = batch.target === "CLIENT" ? "CLIENT" : "STAFF", counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: counterKey } }, create: { organisationId: context.organisation.id, key: counterKey, currentValue: 1 }, update: { currentValue: { increment: 1 } } });
        let canonicalRecordId: string;
        if (batch.target === "CLIENT") { const created = await tx.client.create({ data: { organisationId: context.organisation.id, locationId, clientReference: formatPersonReference("CLI", counter.currentValue), clientNumber: counter.currentValue, firstName: row.firstName!, lastName: row.lastName!, dateOfBirth: row.dateOfBirth, email: row.email, phone: row.phone, status: "ACTIVE" } }); canonicalRecordId = created.id; }
        else { const created = await tx.staffMember.create({ data: { organisationId: context.organisation.id, locationId, employeeReference: formatPersonReference("STF", counter.currentValue), staffNumber: counter.currentValue, firstName: row.firstName!, lastName: row.lastName!, workEmail: row.email, workPhone: row.phone, jobTitle: row.jobTitle!, employmentStatus: "ACTIVE" } }); canonicalRecordId = created.id; if (coreCourses.length) await tx.staffTrainingRequirement.createMany({ data: coreCourses.map((course) => ({ organisationId: context.organisation.id, staffMemberId: created.id, trainingCourseId: course.id })), skipDuplicates: true }); }
        await tx.externalIdentifier.create({ data: { organisationId: context.organisation.id, connectionId: batch.connectionId, sourceSystem: batch.sourceSystem, entityType: batch.target, externalId: row.externalId, recordId: canonicalRecordId, lastSeenAt: new Date(), metadata: { importBatchId: batch.id, rowNumber: row.rowNumber } } });
        await tx.importRow.update({ where: { id: row.id }, data: { status: "CREATED", canonicalRecordId, appliedById: context.user.id, appliedAt: new Date() } }); createdCount += 1;
      }
      if (batch.target === "STAFF_MEMBER" && createdCount) await syncTrainingMatrixEvidence(tx, { organisationId: context.organisation.id, actorId: context.user.id });
      const unresolved = await tx.importRow.groupBy({ by: ["status"], where: { batchId: batch.id }, _count: { _all: true } }), byStatus = new Map(unresolved.map((item) => [item.status, item._count._all])), appliedRows = (byStatus.get("CREATED") ?? 0) + (byStatus.get("LINKED_NO_CHANGE") ?? 0), pending = (byStatus.get("READY_TO_CREATE") ?? 0) + (byStatus.get("POTENTIAL_MATCH") ?? 0) + (byStatus.get("INVALID") ?? 0), status = pending ? "PARTIALLY_APPLIED" : "COMPLETED";
      await tx.importBatch.update({ where: { id: batch.id }, data: { status, appliedRows, approvedById: context.user.id, approvedAt: new Date() } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: batch.locationId, userId: context.user.id, action: "APPROVAL", recordType: "ImportBatch", recordId: batch.id, summary: `Applied reviewed rows from ${batch.reference}`, afterValue: { createdCount, linkedWithoutOverwrite: linkedCount, unresolvedRows: pending, automaticAmbiguousMerges: 0 } } });
      return { createdCount, linkedCount, unresolvedRows: pending, status };
    });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not apply the reviewed import rows." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
