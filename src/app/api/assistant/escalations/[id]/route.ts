import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]), response: z.string().trim().min(12).max(3000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.ORGANISATION_MANAGE]), { id } = await params, db = createDb();
  try {
    const input = schema.parse(await request.json()), scope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
    const escalation = await db.assistantEscalation.findFirst({ where: { id, organisationId: context.organisation.id, status: { in: ["OPEN", "ACKNOWLEDGED"] }, ...scope } });
    if (!escalation) return NextResponse.json({ error: "Abi escalation is not available for review." }, { status: 404 });
    const now = new Date();
    await db.$transaction([
      db.assistantEscalation.update({ where: { id }, data: { status: input.status, response: input.response, assignedToId: escalation.assignedToId ?? context.user.id, acknowledgedAt: escalation.acknowledgedAt ?? now, resolvedAt: ["RESOLVED", "DISMISSED"].includes(input.status) ? now : null, resolvedById: ["RESOLVED", "DISMISSED"].includes(input.status) ? context.user.id : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: escalation.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "AssistantEscalation", recordId: id, summary: `${input.status.toLowerCase()} Abi escalation ${escalation.reference}`, beforeValue: { status: escalation.status }, afterValue: { status: input.status, managementResponseRecorded: true } } }),
    ]);
    return NextResponse.json({ ok: true, status: input.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "The escalation could not be reviewed." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
