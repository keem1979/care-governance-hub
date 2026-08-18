import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const status = String(form.get("status") ?? "");
  const decision = String(form.get("decision") ?? "").trim();
  if (!["APPLIED", "DISMISSED", "NOT_APPLICABLE"].includes(status)) return NextResponse.json({ error: "Choose a valid dependency decision." }, { status: 400 });
  if (decision.length < 12) return NextResponse.json({ error: "Record what was checked and why (at least 12 characters)." }, { status: 400 });
  const db = createDb();
  try {
    const locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map(({ id: locationId }) => locationId) } }] };
    const item = await db.dependencyReview.findFirst({ where: { id, organisationId: context.organisation.id, ...locationScope }, include: { materialChange: { select: { carePlanId: true, summary: true } } } });
    if (!item) return NextResponse.json({ error: "Dependency review not found." }, { status: 404 });
    await db.$transaction([
      db.dependencyReview.update({ where: { id }, data: { status: status as "APPLIED" | "DISMISSED" | "NOT_APPLICABLE", decision, reviewedById: context.user.id, reviewedAt: new Date() } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: item.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "DependencyReview", recordId: id, summary: `Reviewed dependency: ${item.targetTitle}`, beforeValue: { status: item.status }, afterValue: { status, decision, sourceRecordChangedByThisDecision: false, carePlanId: item.materialChange.carePlanId } } }),
    ]);
    return NextResponse.json({ ok: true });
  } finally { await db.$disconnect(); }
}
