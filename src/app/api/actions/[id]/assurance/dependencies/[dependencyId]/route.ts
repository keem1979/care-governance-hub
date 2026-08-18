import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; dependencyId: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id, dependencyId } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const item = await db.externalDependency.findFirst({ where: { id: dependencyId, actionId: id, organisationId: context.organisation.id } });
    if (!item) return NextResponse.json({ error: "External dependency not found." }, { status: 404 });
    const intent = text(form, "intent"), summary = text(form, "summary");
    if (!['chase', 'resolve'].includes(intent) || summary.length < 8) throw new Error("Record a chase or resolution outcome of at least 8 characters.");
    const now = new Date(), status = intent === "resolve" ? "RESOLVED" : "CHASING";
    await db.$transaction(async (tx) => {
      await tx.externalDependency.update({ where: { id: dependencyId }, data: { status, lastChasedAt: intent === "chase" ? now : item.lastChasedAt, chaseCount: intent === "chase" ? { increment: 1 } : undefined, responseSummary: summary, resolvedAt: intent === "resolve" ? now : null } });
      if (intent === "resolve" && await tx.externalDependency.count({ where: { actionId: id, status: { in: ["AWAITING_RESPONSE", "CHASING", "OVERDUE"] }, id: { not: dependencyId } } }) === 0) await tx.action.update({ where: { id }, data: { escalationRequired: false, escalationReason: null, status: action.status === "BLOCKED" ? "IN_PROGRESS" : action.status } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "ExternalDependency", recordId: dependencyId, summary: `${intent === "resolve" ? "Resolved" : "Chased"} external dependency for ${action.reference}`, beforeValue: { status: item.status, chaseCount: item.chaseCount }, afterValue: { status, summary, at: now } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the external dependency." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
