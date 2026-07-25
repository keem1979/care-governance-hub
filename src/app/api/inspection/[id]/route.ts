import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { CQC_KEY_QUESTIONS, INSPECTION_EVIDENCE_STATUSES, inspectionScopeWhere, splitEvidenceExamples } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { registerScopeWhere } from "@/lib/registers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const existing = await db.complianceRequirement.findFirst({ where: { id, ...inspectionScopeWhere(context) } });
    if (!existing) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });
    const title = String(form.get("title") ?? "").trim(), explanation = String(form.get("explanation") ?? "").trim(), keyQuestion = String(form.get("keyQuestion") ?? ""), evidenceStatus = String(form.get("evidenceStatus") ?? "");
    const locationId = String(form.get("locationId") ?? "") || null, ownerId = String(form.get("ownerId") ?? "") || null;
    if (title.length < 3 || explanation.length < 10) throw new Error("Enter the requirement title and explanation.");
    if (!CQC_KEY_QUESTIONS.includes(keyQuestion as never) || !INSPECTION_EVIDENCE_STATUSES.includes(evidenceStatus as never)) throw new Error("Choose valid inspection values.");
    if (locationId && !context.locations.some(({ id }) => id === locationId)) throw new Error("Choose an authorised location.");
    if (ownerId && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active owner.");
    const evidenceIds = form.getAll("evidenceIds").map(String), auditIds = form.getAll("auditIds").map(String), registerEntryIds = form.getAll("registerEntryIds").map(String), actionIds = form.getAll("actionIds").map(String);
    for (const linkedId of evidenceIds) if (!(await db.evidence.findFirst({ where: { id: linkedId, ...evidenceScopeWhere(context) } }))) throw new Error("Linked evidence was not found.");
    for (const linkedId of auditIds) if (!(await db.audit.findFirst({ where: { id: linkedId, ...auditScopeWhere(context) } }))) throw new Error("Linked audit was not found.");
    for (const linkedId of registerEntryIds) if (!(await db.registerEntry.findFirst({ where: { id: linkedId, ...registerScopeWhere(context) } }))) throw new Error("Linked register entry was not found.");
    for (const linkedId of actionIds) if (!(await db.action.findFirst({ where: { id: linkedId, ...actionScopeWhere(context) } }))) throw new Error("Linked action was not found.");
    await db.$transaction(async (tx) => {
      await tx.complianceRequirement.update({ where: { id }, data: { locationId, keyQuestion: keyQuestion as never, qualityStatement: text(form, "qualityStatement"), title, explanation, evidenceExamples: splitEvidenceExamples(form.get("evidenceExamples")), ownerId, reviewDate: parseOptionalDate(form.get("reviewDate")), evidenceStatus: evidenceStatus as never, confidenceNote: text(form, "confidenceNote"), evidenceLinks: { deleteMany: {}, create: evidenceIds.map((evidenceId) => ({ evidenceId })) }, auditLinks: { deleteMany: {}, create: auditIds.map((auditId) => ({ auditId })) }, registerLinks: { deleteMany: {}, create: registerEntryIds.map((registerEntryId) => ({ registerEntryId })) }, actionLinks: { deleteMany: {}, create: actionIds.map((actionId) => ({ actionId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "ComplianceRequirement", recordId: id, summary: `Updated inspection evidence requirement: ${title}`, beforeValue: { evidenceStatus: existing.evidenceStatus }, afterValue: { evidenceStatus, ownerId } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update requirement." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim() || null; }
