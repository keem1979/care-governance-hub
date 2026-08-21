import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

const OUTCOMES = ["RESOLVED", "IMPROVED_NOT_RESOLVED", "UNCHANGED", "DETERIORATED", "INSUFFICIENT_EVIDENCE"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string; findingId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id, findingId } = await params, form = await request.formData(), db = createDb();
  try {
    const outcome = String(form.get("outcome") ?? ""), result = String(form.get("result") ?? "").trim(), decision = String(form.get("decision") ?? "").trim(), sampleDetails = String(form.get("sampleDetails") ?? "").trim(), sampleSizeRaw = String(form.get("sampleSize") ?? "").trim(), sampleSize = sampleSizeRaw ? Number(sampleSizeRaw) : null, reviewDate = new Date(`${String(form.get("reviewDate") ?? "")}T12:00:00.000Z`), evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    if (!OUTCOMES.includes(outcome)) throw new Error("Choose a valid targeted re-audit outcome.");
    if (Number.isNaN(reviewDate.getTime())) throw new Error("Choose the re-audit date.");
    if (sampleSize !== null && (!Number.isInteger(sampleSize) || sampleSize < 1)) throw new Error("Sample size must be a whole number greater than zero.");
    if (result.length < 12 || decision.length < 12) throw new Error("Record what the targeted sample found and the resulting governance decision.");
    if (!evidenceIds.length) throw new Error("Link at least one Evidence record supporting the re-audit outcome.");
    const finding = await db.auditFinding.findFirst({ where: { id: findingId, auditId: id, audit: auditScopeWhere(context) }, select: { id: true, summary: true, criterionKeySnapshot: true, audit: { select: { organisationId: true, locationId: true } } } });
    if (!finding) return NextResponse.json({ error: "Audit Finding not found." }, { status: 404 });
    const evidence = await db.evidence.findMany({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true } });
    if (evidence.length !== evidenceIds.length) throw new Error("One or more Evidence records are unavailable in your authorised scope.");
    const review = await db.$transaction(async (tx) => {
      const created = await tx.auditReaudit.create({ data: { organisationId: finding.audit.organisationId, locationId: finding.audit.locationId, findingId, criterionKeySnapshot: finding.criterionKeySnapshot, reviewDate, outcome: outcome as never, sampleSize, sampleDetails: sampleDetails || null, result, decision, reviewerId: context.user.id, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId, linkedById: context.user.id })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: finding.audit.locationId, userId: context.user.id, action: "CREATE", recordType: "AuditReaudit", recordId: created.id, summary: `Recorded targeted re-audit for: ${finding.summary}`, afterValue: { findingId, criterionKeySnapshot: finding.criterionKeySnapshot, outcome, sampleSize, evidenceIds } } });
      return created;
    });
    return NextResponse.json({ ok: true, id: review.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record targeted re-audit." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
