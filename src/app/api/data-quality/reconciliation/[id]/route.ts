import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const note = String(form.get("note") ?? "").trim();
  const canonicalRecordId = String(form.get("canonicalRecordId") ?? "").trim() || null;
  if (!['confirm_distinct', 'escalate_merge'].includes(action)) return NextResponse.json({ error: "Choose a valid review decision." }, { status: 400 });
  if (note.length < 12) return NextResponse.json({ error: "Record a clear review rationale of at least 12 characters." }, { status: 400 });
  const db = createDb();
  try {
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }] };
    const item = await db.reconciliationCase.findFirst({ where: { id, organisationId: context.organisation.id, ...locationScope } });
    if (!item) return NextResponse.json({ error: "Reconciliation case not found." }, { status: 404 });
    if (action === "escalate_merge" && (!canonicalRecordId || !item.candidateRecordIds.includes(canonicalRecordId))) return NextResponse.json({ error: "Choose which candidate should be treated as the proposed canonical record." }, { status: 400 });
    const now = new Date();
    const status = action === "confirm_distinct" ? "DISTINCT_CONFIRMED" : "MERGE_ESCALATED";
    await db.$transaction([
      db.reconciliationCase.update({ where: { id }, data: { status, reviewNote: note, reviewedById: context.user.id, reviewedAt: now, resolvedAt: action === "confirm_distinct" ? now : null, canonicalRecordId: action === "escalate_merge" ? canonicalRecordId : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: item.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ReconciliationCase", recordId: id, summary: action === "confirm_distinct" ? `Confirmed ${item.reference} records are distinct` : `Escalated ${item.reference} for controlled merge review`, beforeValue: { status: item.status }, afterValue: { status, note, canonicalRecordId, sourceRecordsChanged: false } } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally { await db.$disconnect(); }
}
