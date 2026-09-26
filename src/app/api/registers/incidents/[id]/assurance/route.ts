import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { incidentAssuranceReadiness, incidentClosureAuthority } from "@/lib/incident-assurance";
import { PERMISSIONS } from "@/lib/permissions";
import { assertRegisterWriteScope, registerScopeWhere } from "@/lib/registers";

const DECISIONS = ["NOT_ASSURED", "ASSURED_CLOSED", "REOPENED"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const decision = String(form.get("decision") ?? "");
    const rationale = String(form.get("rationale") ?? "").trim();
    if (!DECISIONS.includes(decision as never)) throw new Error("Choose a valid assurance decision.");
    if (rationale.length < 12 || rationale.length > 5000) throw new Error("Record a clear decision rationale of at least 12 characters.");
    const incident = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "incidents" }, archivedAt: null }, include: { incidentInvestigation: true } });
    if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    assertRegisterWriteScope(context, incident.locationId);
    if (incident.riskLevel === "UNASSESSED") throw new Error("Assess the Incident risk before recording management assurance or closure.");
    const evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    const evidenceCount = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context), status: "ACTIVE" } }) : 0;
    if (evidenceCount !== evidenceIds.length) throw new Error("One or more selected Evidence records are unavailable or outside your authorised scope.");
    const actions = await db.action.findMany({
      where: { ...actionScopeWhere(context), sourceType: "INCIDENT", sourceRecordId: id, archivedAt: null },
      select: { id: true, closedAt: true, effectivenessReviews: { orderBy: { reviewDate: "desc" }, take: 1, select: { outcome: true } } },
    });
    const readiness = incidentAssuranceReadiness({
      riskLevel: incident.riskLevel,
      data: record(incident.data),
      investigation: incident.incidentInvestigation,
      actions: actions.map((action) => ({ id: action.id, closedAt: action.closedAt, effectivenessOutcome: action.effectivenessReviews[0]?.outcome ?? null })),
      closureEvidenceCount: evidenceCount,
    });
    const authority = incidentClosureAuthority({ riskLevel: incident.riskLevel, actorRoleKey: context.role.key, actorId: context.user.id, createdById: incident.createdById, investigatorId: incident.incidentInvestigation?.investigatorId });
    if (decision === "ASSURED_CLOSED") {
      if (incident.status === "CLOSED") throw new Error("This Incident is already closed.");
      if (!readiness.ready) throw new Error(`Incident is not ready for closure: ${readiness.outstanding.map((item) => item.label).join("; ")}.`);
      if (!authority.allowed) throw new Error(authority.reason);
    }
    if (decision === "NOT_ASSURED" && incident.status === "CLOSED") throw new Error("Reopen the Incident before recording a new not-assured decision.");
    if (decision === "REOPENED") {
      if (incident.status !== "CLOSED") throw new Error("Only a closed Incident can be reopened.");
      if (!authority.roleAuthorised) throw new Error(authority.reason);
    }
    const now = new Date();
    await db.$transaction(async (tx) => {
      const review = await tx.incidentAssuranceReview.create({ data: { organisationId: context.organisation.id, locationId: incident.locationId, incidentId: id, reviewerId: context.user.id, reviewerRoleKeySnapshot: context.role.key, riskLevelSnapshot: incident.riskLevel, decision: decision as never, rationale, checksSnapshot: readiness.checks as Prisma.InputJsonValue, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      const nextStatus = decision === "ASSURED_CLOSED" ? "CLOSED" : decision === "REOPENED" ? "IN_REVIEW" : incident.status === "OPEN" ? "IN_REVIEW" : incident.status;
      await tx.registerEntry.update({ where: { id }, data: { status: nextStatus as never, closureDate: decision === "ASSURED_CLOSED" ? now : decision === "REOPENED" ? null : incident.closureDate } });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: `ASSURANCE_${decision}`, snapshot: { reviewId: review.id, decision, riskLevel: incident.riskLevel, roleKey: context.role.key, rationale, ready: readiness.ready, outstanding: readiness.outstanding.map((item) => item.key), evidenceIds } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: incident.locationId, userId: context.user.id, action: decision === "ASSURED_CLOSED" ? "CLOSE" : "STATUS_CHANGE", recordType: "IncidentAssuranceReview", recordId: review.id, summary: `${decision.replaceAll("_", " ")} for ${incident.reference}`, afterValue: { incidentId: id, decision, ready: readiness.ready, evidenceCount, roleKey: context.role.key } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record the assurance decision." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function record(value: Prisma.JsonValue): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
