import { NextResponse } from "next/server";
import { z } from "zod";
import { serviceReadinessUpdateSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = serviceReadinessUpdateSchema.parse(await request.json()), item = await db.serviceReadinessItem.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!item) return NextResponse.json({ error: "The service-readiness item was not found." }, { status: 404 });
    const evidenceId = input.evidenceId || null;
    if (input.status === "EVIDENCED") {
      const evidence = await db.evidence.findFirst({ where: { id: evidenceId ?? undefined, organisationId: context.organisation.id, status: "ACTIVE", currentVersionId: { not: null } }, include: { verifications: { orderBy: { verifiedAt: "desc" }, take: 1 } } });
      const latest = evidence?.verifications[0];
      if (!evidence || !latest || latest.evidenceVersionId !== evidence.currentVersionId || !["VERIFIED", "VERIFIED_WITH_LIMITATIONS"].includes(latest.outcome)) return NextResponse.json({ error: "Select active evidence whose current version has an independent verification." }, { status: 409 });
    }
    const evidenced = input.status === "EVIDENCED", now = new Date();
    await db.$transaction([
      db.serviceReadinessItem.update({ where: { id }, data: { status: input.status, evidenceNote: input.evidenceNote || null, evidenceId: evidenced ? evidenceId : null, completedById: evidenced ? context.user.id : null, completedAt: evidenced ? now : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ServiceReadinessItem", recordId: id, summary: `Updated commercial service readiness: ${item.title}`, beforeValue: { status: item.status }, afterValue: { status: input.status, evidenceRecorded: Boolean(input.evidenceNote), verifiedEvidenceLinked: evidenced } } }),
    ]);
    return NextResponse.json({ message: "Service-readiness evidence updated." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The service-readiness item could not be updated." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
