import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceAssuranceState } from "@/lib/evidence-assurance";
import { decisionImplementationGate, independentDecisionReview } from "@/lib/governance-control";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const decision = await db.governanceDecision.findFirst({ where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) } });
    if (!decision) return NextResponse.json({ error: "Decision not found." }, { status: 404 });
    const intent = text(form, "intent"), note = text(form, "note");
    if (intent === "implement") {
      if (!["RECORDED", "ACTION_REQUIRED"].includes(decision.status)) throw new Error("Only an open decision can be implemented.");
      if (note.length < 12) throw new Error("Record what changed and how the decision was put into practice.");
      const evidenceId = text(form, "evidenceId") || null;
      const evidence = evidenceId ? await db.evidence.findFirst({ where: { id: evidenceId, organisationId: context.organisation.id, status: "ACTIVE" }, include: { verifications: { orderBy: { verifiedAt: "desc" }, take: 1 } } }) : null;
      if (evidenceId && !evidence) throw new Error("Choose an active evidence record in your organisation.");
      const state = evidence ? evidenceAssuranceState({ status: evidence.status, reviewExpiryDate: evidence.reviewExpiryDate, updatedAt: evidence.updatedAt, currentVersionId: evidence.currentVersionId, verification: evidence.verifications[0] }) : null;
      const gate = decisionImplementationGate({ impact: decision.impact, evidenceId, evidenceState: state });
      if (!gate.allowed) throw new Error(gate.reason!);
      await db.$transaction([db.governanceDecision.update({ where: { id }, data: { status: "IMPLEMENTED", implementationEvidenceId: evidenceId, implementationNote: note, implementedById: context.user.id, implementedAt: new Date() } }), db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: decision.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "GovernanceDecision", recordId: id, summary: "Recorded decision implementation; independent review remains due", beforeValue: { status: decision.status }, afterValue: { status: "IMPLEMENTED", evidenceId, evidenceState: state } } })]);
    } else if (intent === "review") {
      if (decision.status !== "IMPLEMENTED") throw new Error("The decision must be implemented before independent review.");
      if (!independentDecisionReview({ ownerId: decision.ownerId, implementedById: decision.implementedById, reviewerId: context.user.id })) throw new Error("The accountable owner or implementer cannot independently review this decision.");
      if (note.length < 12) throw new Error("Record the measured review outcome.");
      await db.$transaction([db.governanceDecision.update({ where: { id }, data: { status: "REVIEWED", reviewedById: context.user.id, reviewedAt: new Date(), reviewOutcome: note } }), db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: decision.locationId, userId: context.user.id, action: "APPROVAL", recordType: "GovernanceDecision", recordId: id, summary: "Independently reviewed governance decision", beforeValue: { status: decision.status }, afterValue: { status: "REVIEWED", reviewerId: context.user.id } } })]);
    } else throw new Error("Unknown decision update.");
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the decision." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
