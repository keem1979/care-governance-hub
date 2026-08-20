import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const form = await request.formData(); const summary = String(form.get("summary") ?? "").trim().slice(0, 4000);
  if (summary.length < 20) return NextResponse.json({ error: "Record the overall inspection conclusion and follow-up required." }, { status: 400 });
  const db = createDb();
  try {
    const inspection = await db.mockInspection.findFirst({ where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) }, include: { samples: true } });
    if (!inspection) return NextResponse.json({ error: "Mock inspection not found." }, { status: 404 });
    if (inspection.status === "COMPLETED" || inspection.status === "CANCELLED") return NextResponse.json({ error: "This mock inspection is already closed." }, { status: 409 });
    if (inspection.samples.some((item) => item.outcome === "NOT_TESTED")) return NextResponse.json({ error: "Complete every sampled requirement before closing the mock inspection." }, { status: 409 });
    await db.$transaction([
      db.mockInspection.update({ where: { id }, data: { status: "COMPLETED", summary, completedAt: new Date() } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: inspection.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "MockInspection", recordId: id, summary: `Completed mock inspection: ${inspection.title}`, afterValue: { outcomes: inspection.samples.map((item) => item.outcome) } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete the mock inspection." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
