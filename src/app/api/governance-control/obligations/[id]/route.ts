import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { obligationTransitionAllowed, OBLIGATION_STATUSES, OBLIGATION_UPDATE_TYPES } from "@/lib/governance-control";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const obligation = await db.governanceObligation.findFirst({ where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) } });
    if (!obligation) return NextResponse.json({ error: "Obligation not found." }, { status: 404 });
    const updateType = text(form, "updateType"), note = text(form, "note"), nextStatus = text(form, "nextStatus") || obligation.status, evidenceId = text(form, "evidenceId") || null, submissionReference = text(form, "submissionReference") || null;
    if (!OBLIGATION_UPDATE_TYPES.includes(updateType as never) || note.length < 8) throw new Error("Choose an update type and record a meaningful chronology note.");
    if (!OBLIGATION_STATUSES.includes(nextStatus as never)) throw new Error("Choose a valid obligation status.");
    if (nextStatus !== obligation.status && !obligationTransitionAllowed(obligation.status, nextStatus)) throw new Error(`The obligation cannot move directly from ${obligation.status} to ${nextStatus}.`);
    if (updateType === "SUBMISSION" && (!submissionReference || !evidenceId || nextStatus !== "SUBMITTED")) throw new Error("A submission requires its reference, linked evidence and Submitted status.");
    if (updateType === "ACCEPTANCE" && nextStatus !== "ACCEPTED") throw new Error("An acceptance update must move the obligation to Accepted.");
    if (updateType === "CLOSURE" && (obligation.status !== "ACCEPTED" || nextStatus !== "CLOSED")) throw new Error("Only an accepted obligation can be closed.");
    if (evidenceId && !(await db.evidence.findFirst({ where: { id: evidenceId, organisationId: context.organisation.id, status: "ACTIVE" } }))) throw new Error("Choose active evidence in your organisation.");
    const now = new Date(), isChase = updateType === "CHASE";
    await db.$transaction(async (tx) => {
      await tx.governanceObligation.update({ where: { id }, data: { status: nextStatus as never, evidenceId: evidenceId ?? obligation.evidenceId, submissionReference: submissionReference ?? obligation.submissionReference, latestResponse: ["QUERY", "RESPONSE", "ACCEPTANCE"].includes(updateType) ? note : obligation.latestResponse, ...(isChase ? { lastChasedAt: now, chaseCount: { increment: 1 } } : {}), ...(nextStatus === "CLOSED" ? { closedAt: now } : {}) } });
      await tx.governanceObligationUpdate.create({ data: { obligationId: id, updateType: updateType as never, note, evidenceId, actorId: context.user.id } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: obligation.locationId, userId: context.user.id, action: nextStatus === "CLOSED" ? "CLOSE" : "STATUS_CHANGE", recordType: "GovernanceObligation", recordId: id, summary: `${updateType.toLowerCase().replaceAll("_", " ")} recorded for ${obligation.reference}`, beforeValue: { status: obligation.status, chaseCount: obligation.chaseCount }, afterValue: { status: nextStatus, evidenceId, submissionReference } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the obligation." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
