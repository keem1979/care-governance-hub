import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { complaintAssuranceReadiness, complaintClosureAuthority } from "@/lib/complaint-assurance";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { assertRegisterWriteScope, registerScopeWhere } from "@/lib/registers";

const schema = z.object({ decision: z.enum(["NOT_ASSURED", "ASSURED_CLOSED", "REOPENED"]), rationale: z.string().trim().min(12).max(5000), newInformation: z.string().trim().max(5000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const input = schema.parse({ decision: String(form.get("decision") ?? ""), rationale: String(form.get("rationale") ?? ""), newInformation: String(form.get("newInformation") ?? "") });
    const complaint = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "complaints" }, archivedAt: null }, include: { complaintInvestigation: true, complaintIssues: { include: { _count: { select: { evidenceLinks: true } } } }, complaintCommunications: { orderBy: { occurredAt: "asc" } } } });
    if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    assertRegisterWriteScope(context, complaint.locationId);
    if (complaint.riskLevel === "UNASSESSED") throw new Error("Assess the Complaint risk before recording management assurance or closure.");
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    const evidenceCount = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context), status: "ACTIVE" } }) : 0;
    if (evidenceCount !== evidenceIds.length) throw new Error("One or more selected Evidence records are unavailable or outside your authorised scope.");
    const actions = await db.action.findMany({ where: { ...actionScopeWhere(context), sourceType: "COMPLAINT", sourceRecordId: id, archivedAt: null }, select: { id: true, closedAt: true, effectivenessReviews: { orderBy: { reviewDate: "desc" }, take: 1, select: { outcome: true } } } });
    const acknowledgement = complaint.complaintCommunications.find((item) => item.type === "ACKNOWLEDGEMENT");
    const finalResponse = complaint.complaintCommunications.findLast((item) => item.type === "FINAL_RESPONSE");
    const readiness = complaintAssuranceReadiness({ riskLevel: complaint.riskLevel, investigation: complaint.complaintInvestigation, issues: complaint.complaintIssues.map((issue) => ({ finding: issue.finding, reasoning: issue.reasoning, actionRequired: issue.actionRequired, evidenceCount: issue._count.evidenceLinks })), actions: actions.map((action) => ({ id: action.id, closedAt: action.closedAt, effectivenessOutcome: action.effectivenessReviews[0]?.outcome ?? null })), acknowledged: Boolean(acknowledgement), responseIssued: Boolean(finalResponse), finalResponseEvidence: Boolean(finalResponse?.evidenceId), closureEvidenceCount: evidenceCount });
    const authority = complaintClosureAuthority({ riskLevel: complaint.riskLevel, actorRoleKey: context.role.key, actorId: context.user.id, createdById: complaint.createdById, investigatorId: complaint.complaintInvestigation?.investigatorId });
    if (input.decision === "ASSURED_CLOSED") {
      if (complaint.status === "CLOSED") throw new Error("This Complaint is already closed.");
      if (!readiness.state.includes("READY")) throw new Error(`Complaint is not ready for closure: ${readiness.outstanding.map((item) => item.label).join("; ")}.`);
      if (!authority.allowed) throw new Error(authority.reason);
    }
    if (input.decision === "NOT_ASSURED" && complaint.status === "CLOSED") throw new Error("Reopen the Complaint before recording a new not-assured decision.");
    if (input.decision === "REOPENED") {
      if (complaint.status !== "CLOSED") throw new Error("Only a closed Complaint can be reopened.");
      if (input.newInformation.length < 8) throw new Error("Record the material new information that requires reopening.");
      if (!authority.roleAuthorised) throw new Error(authority.reason);
    }
    const now = new Date();
    await db.$transaction(async (tx) => {
      const review = await tx.complaintAssuranceReview.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, complaintId: id, reviewerId: context.user.id, reviewerRoleKeySnapshot: context.role.key, riskLevelSnapshot: complaint.riskLevel, decision: input.decision, rationale: input.rationale, newInformation: input.newInformation || null, checksSnapshot: readiness.checks as Prisma.InputJsonValue, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      const nextStatus = input.decision === "ASSURED_CLOSED" ? "CLOSED" : input.decision === "REOPENED" ? "IN_REVIEW" : complaint.status === "OPEN" ? "IN_REVIEW" : complaint.status;
      await tx.registerEntry.update({ where: { id }, data: { status: nextStatus, closureDate: input.decision === "ASSURED_CLOSED" ? now : input.decision === "REOPENED" ? null : complaint.closureDate } });
      if (input.decision === "REOPENED") await tx.complaintCommunication.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, complaintId: id, type: "POST_RESPONSE", direction: "INTERNAL", occurredAt: now, participants: context.user.name, summary: `Material new information recorded on reopening: ${input.newInformation}`, authorId: context.user.id, evidenceId: evidenceIds[0] ?? null } });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: `ASSURANCE_${input.decision}`, snapshot: { reviewId: review.id, decision: input.decision, roleKey: context.role.key, rationale: input.rationale, newInformation: input.newInformation || null, ready: readiness.state === "READY_FOR_ASSURANCE", outstanding: readiness.outstanding.map((item) => item.key), evidenceIds } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, userId: context.user.id, action: input.decision === "ASSURED_CLOSED" ? "CLOSE" : "STATUS_CHANGE", recordType: "ComplaintAssuranceReview", recordId: review.id, summary: `${input.decision.replaceAll("_", " ")} for ${complaint.reference}`, afterValue: { complaintId: id, decision: input.decision, ready: readiness.state === "READY_FOR_ASSURANCE", evidenceCount, roleKey: context.role.key } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record the Complaint assurance decision." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
