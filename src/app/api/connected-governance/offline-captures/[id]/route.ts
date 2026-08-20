import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ intent: z.enum(["accept", "reject"]), reviewNote: z.string().trim().min(12).max(3000), conflictReviewed: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, db = createDb();
  try {
    const input = schema.parse(await request.json()), scope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }, capture = await db.offlineCapture.findFirst({ where: { id, organisationId: context.organisation.id, status: { in: ["PENDING_REVIEW", "CONFLICT"] }, ...scope } });
    if (!capture) return NextResponse.json({ error: "Offline capture is not available for review." }, { status: 404 });
    if (capture.status === "CONFLICT" && input.intent === "accept" && !input.conflictReviewed) throw new Error("Confirm that the source conflict was reviewed before accepting this capture.");
    await db.$transaction(async (tx) => {
      let evidenceId: string | null = null;
      if (input.intent === "accept") {
        const evidence = await tx.evidence.create({ data: { organisationId: context.organisation.id, locationId: capture.locationId, title: capture.title, description: `Reviewed offline ${capture.captureType.toLowerCase().replaceAll("_", " ")} captured ${capture.capturedAt.toISOString()}.`, category: "Offline observation", evidenceType: "Observation note", ownerId: context.user.id, evidenceDate: capture.capturedAt, tags: ["offline-capture", "pending-verification"], relatedModule: capture.sourceRecordType ?? "OfflineCapture", relatedRecordId: capture.sourceRecordId ?? capture.id, confidentiality: "INTERNAL", status: "ACTIVE", notes: capture.note, sourceType: "OBSERVATION", sourceName: "Encrypted offline capture", sourceReference: capture.clientCaptureId, capturedAt: capture.capturedAt, provenanceNote: `Synchronised from a locally encrypted device queue and accepted by ${context.user.name}. This evidence remains unverified until separately reviewed.`, uploadedById: context.user.id } });
        evidenceId = evidence.id;
      }
      await tx.offlineCapture.update({ where: { id }, data: { status: input.intent === "accept" ? "ACCEPTED" : "REJECTED", evidenceId, reviewedById: context.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: capture.locationId, userId: context.user.id, action: input.intent === "accept" ? "APPROVAL" : "STATUS_CHANGE", recordType: "OfflineCapture", recordId: id, summary: `${input.intent === "accept" ? "Accepted" : "Rejected"} offline capture after review`, beforeValue: { status: capture.status, conflictReason: capture.conflictReason }, afterValue: { status: input.intent === "accept" ? "ACCEPTED" : "REJECTED", evidenceId, conflictReviewed: Boolean(input.conflictReviewed), sourceRecordChanged: false } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not review the offline capture." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
