import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceAssuranceState, mappingSupportsClaim } from "@/lib/evidence-assurance";
import { evidenceScopeWhere } from "@/lib/evidence";
import { CQC_KEY_QUESTIONS, inspectionScopeWhere, splitEvidenceExamples } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { registerScopeWhere } from "@/lib/registers";
import { rmFields, validatedLinks } from "@/app/api/inspection/route";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const existing = await db.complianceRequirement.findFirst({
      where: { id, ...inspectionScopeWhere(context) },
      include: {
        evidenceLinks: { select: { evidenceId: true } },
        auditLinks: { select: { auditId: true } },
        registerLinks: { select: { registerEntryId: true } },
        actionLinks: { select: { actionId: true } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Requirement not found." }, { status: 404 });

    const locationId = String(form.get("locationId") ?? "") || null;
    const ownerId = String(form.get("ownerId") ?? "") || null;
    if (locationId && !context.locations.some((item) => item.id === locationId)) throw new Error("Choose an authorised location.");
    if (ownerId && !(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } }))) throw new Error("Choose an active owner.");

    const submitted = await validatedLinks(db, context, form, locationId);
    const [visibleEvidence, visibleAudits, visibleRegisters, visibleActions] = await Promise.all([
      db.evidence.findMany({ where: { id: { in: existing.evidenceLinks.map((link) => link.evidenceId) }, ...evidenceScopeWhere(context) }, select: { id: true } }),
      db.audit.findMany({ where: { id: { in: existing.auditLinks.map((link) => link.auditId) }, ...auditScopeWhere(context) }, select: { id: true } }),
      db.registerEntry.findMany({ where: { id: { in: existing.registerLinks.map((link) => link.registerEntryId) }, ...registerScopeWhere(context) }, select: { id: true } }),
      db.action.findMany({ where: { id: { in: existing.actionLinks.map((link) => link.actionId) }, ...actionScopeWhere(context) }, select: { id: true } }),
    ]);
    const retainHidden = (linkedIds: string[], visibleIds: string[]) => linkedIds.filter((linkedId) => !visibleIds.includes(linkedId));
    const hidden = {
      evidenceIds: retainHidden(existing.evidenceLinks.map((link) => link.evidenceId), visibleEvidence.map((item) => item.id)),
      auditIds: retainHidden(existing.auditLinks.map((link) => link.auditId), visibleAudits.map((item) => item.id)),
      registerEntryIds: retainHidden(existing.registerLinks.map((link) => link.registerEntryId), visibleRegisters.map((item) => item.id)),
      actionIds: retainHidden(existing.actionLinks.map((link) => link.actionId), visibleActions.map((item) => item.id)),
    };
    if (locationId !== existing.locationId && Object.values(hidden).some((ids) => ids.length)) throw new Error("Resolve inaccessible existing links before changing this requirement's location.");
    const links = {
      evidenceIds: [...new Set([...submitted.evidenceIds, ...hidden.evidenceIds])],
      auditIds: [...new Set([...submitted.auditIds, ...hidden.auditIds])],
      registerEntryIds: [...new Set([...submitted.registerEntryIds, ...hidden.registerEntryIds])],
      actionIds: [...new Set([...submitted.actionIds, ...hidden.actionIds])],
    };
    const rm = rmFields(form, context.user.id);
    if (rm.signedOffAt || rm.managementDecision === "ASSURED") {
      const mapped = await db.complianceRequirementEvidence.findMany({
        where: { requirementId: id, evidenceId: { in: submitted.evidenceIds }, evidence: evidenceScopeWhere(context) },
        include: { evidence: { include: { verifications: { orderBy: { verifiedAt: "desc" }, take: 1 } } } },
      });
      const full = mapped.some((mapping) => mappingSupportsClaim(mapping.decision, evidenceAssuranceState({
        status: mapping.evidence.status,
        reviewExpiryDate: mapping.evidence.reviewExpiryDate,
        updatedAt: mapping.evidence.updatedAt,
        currentVersionId: mapping.evidence.currentVersionId,
        verification: mapping.evidence.verifications[0],
      })) === "FULL");
      if (!full) throw new Error("RM assurance and sign-off require at least one current verified evidence item with a suitable requirement mapping.");
    }

    const custom = !existing.catalogueKey;
    const keyQuestion = String(form.get("keyQuestion") ?? existing.keyQuestion);
    const title = String(form.get("title") ?? existing.title).trim();
    const explanation = String(form.get("explanation") ?? existing.explanation).trim();
    if (custom && (!CQC_KEY_QUESTIONS.includes(keyQuestion as never) || title.length < 3 || explanation.length < 10)) throw new Error("Enter valid requirement details.");
    await db.$transaction(async (tx) => {
      await tx.complianceRequirement.update({
        where: { id },
        data: {
          locationId, ownerId, reviewDate: parseOptionalDate(form.get("reviewDate")), confidenceNote: optional(form, "confidenceNote"),
          ...(custom ? { keyQuestion: keyQuestion as never, qualityStatement: optional(form, "qualityStatement"), title, explanation, evidenceExamples: splitEvidenceExamples(form.get("evidenceExamples")) } : {}),
          ...rm,
          auditLinks: { deleteMany: {}, create: links.auditIds.map((auditId) => ({ auditId })) },
          registerLinks: { deleteMany: {}, create: links.registerEntryIds.map((registerEntryId) => ({ registerEntryId })) },
          actionLinks: { deleteMany: {}, create: links.actionIds.map((actionId) => ({ actionId })) },
        },
      });
      await tx.complianceRequirementEvidence.deleteMany({ where: { requirementId: id, evidenceId: { notIn: links.evidenceIds } } });
      for (const evidenceId of submitted.evidenceIds) await tx.complianceRequirementEvidence.upsert({
        where: { requirementId_evidenceId: { requirementId: id, evidenceId } },
        create: { requirementId: id, evidenceId, mappedById: context.user.id, mappedAt: new Date() },
        update: {},
      });
      await tx.activityLog.create({ data: {
        organisationId: context.organisation.id, locationId, userId: context.user.id, action: "UPDATE", recordType: "ComplianceRequirement", recordId: id,
        summary: `RM reviewed inspection requirement: ${existing.title}`,
        beforeValue: { managementDecision: existing.managementDecision, signedOffAt: existing.signedOffAt },
        afterValue: { managementDecision: rm.managementDecision, signedOff: Boolean(rm.signedOffAt), coveredEvidenceCategories: rm.coveredEvidenceCategories },
      } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update requirement." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}

function optional(form: FormData, name: string) { return String(form.get(name) ?? "").trim() || null; }
