import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/auth/dal";
import { hashIntegrationToken, offlineCaptureConflict } from "@/lib/connected-governance";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ clientCaptureId: z.uuid(), captureType: z.enum(["OBSERVATION", "ACTION_EVIDENCE", "RISK_EVIDENCE", "POLICY_EVIDENCE", "OTHER"]), title: z.string().trim().min(4).max(180), note: z.string().trim().min(12).max(6000), capturedAt: z.iso.datetime(), deviceId: z.string().min(16).max(160), locationId: z.union([z.literal(""), z.uuid()]).optional(), sourceRecordType: z.enum(["ACTION", "RISK", "POLICY", "EVIDENCE"]).optional(), sourceRecordId: z.uuid().optional(), baseUpdatedAt: z.iso.datetime().optional() });

export async function POST(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.EVIDENCE_UPLOAD, PERMISSIONS.ASSIGNED_TASKS_EDIT]), db = createDb();
  try {
    const input = schema.parse(await request.json()), locationId = input.locationId || null;
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    const duplicate = await db.offlineCapture.findUnique({ where: { organisationId_clientCaptureId: { organisationId: context.organisation.id, clientCaptureId: input.clientCaptureId } } });
    if (duplicate) return NextResponse.json({ id: duplicate.id, status: duplicate.status, duplicate: true });
    const sourceUpdatedAt = input.sourceRecordType && input.sourceRecordId ? await sourceTimestamp(db, context, input.sourceRecordType, input.sourceRecordId) : null;
    if (input.sourceRecordId && !sourceUpdatedAt) throw new Error("The linked source record is unavailable or outside your authorised scope.");
    const conflictReason = offlineCaptureConflict({ baseUpdatedAt: input.baseUpdatedAt ? new Date(input.baseUpdatedAt) : null, sourceUpdatedAt }), status = conflictReason ? "CONFLICT" : "PENDING_REVIEW", deviceIdHash = await hashIntegrationToken(`${context.organisation.id}:${input.deviceId}`);
    const capture = await db.$transaction(async (tx) => {
      const item = await tx.offlineCapture.create({ data: { organisationId: context.organisation.id, locationId, clientCaptureId: input.clientCaptureId, captureType: input.captureType, title: input.title, note: input.note, capturedAt: new Date(input.capturedAt), deviceIdHash, sourceRecordType: input.sourceRecordType, sourceRecordId: input.sourceRecordId, baseUpdatedAt: input.baseUpdatedAt ? new Date(input.baseUpdatedAt) : null, status, conflictReason, submittedById: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "OfflineCapture", recordId: item.id, summary: `Synchronised encrypted offline capture for review: ${input.title}`, afterValue: { captureType: input.captureType, capturedAt: input.capturedAt, status, sourceRecordType: input.sourceRecordType, sourceRecordId: input.sourceRecordId, deviceIdStoredAsHash: true, canonicalSourceChanged: false } } });
      return item;
    });
    return NextResponse.json({ id: capture.id, status: capture.status, duplicate: false }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not synchronise the offline capture." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

async function sourceTimestamp(db: ReturnType<typeof createDb>, context: { organisation: { id: string }; allLocations: boolean; locations: { id: string }[] }, type: string, id: string) {
  const scope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
  if (type === "ACTION") return (await db.action.findFirst({ where: { id, organisationId: context.organisation.id, ...scope }, select: { updatedAt: true } }))?.updatedAt ?? null;
  if (type === "RISK") return (await db.risk.findFirst({ where: { id, organisationId: context.organisation.id, ...scope }, select: { updatedAt: true } }))?.updatedAt ?? null;
  if (type === "POLICY") return (await db.policy.findFirst({ where: { id, organisationId: context.organisation.id }, select: { updatedAt: true } }))?.updatedAt ?? null;
  if (type === "EVIDENCE") return (await db.evidence.findFirst({ where: { id, organisationId: context.organisation.id, ...scope }, select: { updatedAt: true } }))?.updatedAt ?? null;
  return null;
}
