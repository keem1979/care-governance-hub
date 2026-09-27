import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate, POLICY_CATEGORIES, POLICY_STATUSES, splitList } from "@/lib/policies";
import { syncGeneratedPolicyEvidence } from "@/lib/policy-evidence";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const db = createDb();
  try {
    const current = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!current) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    if (intent === "archive" || intent === "restore") {
      const archive = intent === "archive";
      if (archive && current.status === "ARCHIVED") throw new Error("This policy is already archived.");
      if (!archive && current.status !== "ARCHIVED") throw new Error("Only an archived policy can be restored.");
      await db.$transaction(async (tx) => {
        const updated = await tx.policy.update({ where: { id }, data: {
          status: archive ? "ARCHIVED" : "DRAFT", archivedAt: archive ? new Date() : null,
          ...(!archive ? { approvalStatus: "NOT_SUBMITTED", approvedById: null, approvedAt: null } : {}),
        } });
        if (updated.templateKey && updated.generatedSections) await syncGeneratedPolicyEvidence(tx, policyEvidenceInput(updated, context.user.id));
        await tx.activityLog.create({ data: {
          organisationId: context.organisation.id, userId: context.user.id,
          action: archive ? "ARCHIVE" : "RESTORE", recordType: "Policy", recordId: id,
          summary: `${archive ? "Archived" : "Restored"} policy: ${current.title}`,
        } });
      });
      return NextResponse.json({ ok: true });
    }

    if (intent === "start-review") {
      if (current.status !== "APPROVED") throw new Error("Only an approved policy can start a new review.");
      await db.$transaction(async (tx) => {
        const updated = await tx.policy.update({ where: { id }, data: {
          status: "UNDER_REVIEW", approvalStatus: "PENDING", approvedById: null, approvedAt: null,
        } });
        if (updated.templateKey && updated.generatedSections) await syncGeneratedPolicyEvidence(tx, policyEvidenceInput(updated, context.user.id));
        await tx.activityLog.create({ data: {
          organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE",
          recordType: "Policy", recordId: id, summary: `Started a new review of policy: ${current.title}`,
          beforeValue: { status: current.status, approvalStatus: current.approvalStatus, approvedById: current.approvedById, approvedAt: current.approvedAt },
          afterValue: { status: "UNDER_REVIEW", approvalStatus: "PENDING" },
        } });
      });
      return NextResponse.json({ ok: true });
    }

    if (intent === "approve") {
      if (!['DRAFT', 'UNDER_REVIEW'].includes(current.status)) throw new Error("Only a draft or policy under review can be approved.");
      if (!current.currentVersionId && !(current.templateKey && Array.isArray(current.generatedSections) && current.generatedSections.length > 0)) {
        throw new Error("A controlled policy document or generated content is required before approval.");
      }
      await db.$transaction(async (tx) => {
        const updated = await tx.policy.update({ where: { id }, data: {
          status: "APPROVED", approvalStatus: "APPROVED", approvedById: context.user.id,
          approvedAt: new Date(), lastReviewDate: new Date(),
        } });
        if (updated.templateKey && updated.generatedSections) await syncGeneratedPolicyEvidence(tx, policyEvidenceInput(updated, context.user.id));
        await tx.activityLog.create({ data: {
          organisationId: context.organisation.id, userId: context.user.id, action: "APPROVAL",
          recordType: "Policy", recordId: id, summary: `Approved policy: ${current.title}`,
          beforeValue: { status: current.status, approvalStatus: current.approvalStatus },
          afterValue: { status: "APPROVED", approvalStatus: "APPROVED", approvedById: context.user.id },
        } });
      });
      return NextResponse.json({ ok: true });
    }

    if (intent !== "update") throw new Error("Unknown policy update.");
    if (!['DRAFT', 'UNDER_REVIEW'].includes(current.status)) throw new Error("Start a new review before editing an approved policy.");

    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const ownerId = String(form.get("ownerId") ?? "");
    const status = String(form.get("status") ?? "");
    if (title.length < 3 || title.length > 180) return NextResponse.json({ error: "Enter a valid title." }, { status: 400 });
    if (!POLICY_CATEGORIES.includes(category as never) || !POLICY_STATUSES.includes(status as never) || !['DRAFT', 'UNDER_REVIEW'].includes(status)) return NextResponse.json({ error: "Choose Draft or Under review here. Approval and archive are separate decisions." }, { status: 400 });
    const owner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } });
    if (!owner) return NextResponse.json({ error: "Choose an active policy owner." }, { status: 400 });
    await db.$transaction(async (tx) => {
      const updated = await tx.policy.update({ where: { id }, data: {
        title, category, ownerId, status: status as typeof current.status,
        approvalStatus: status === "UNDER_REVIEW" ? "PENDING" : "NOT_SUBMITTED",
        approvedById: null, approvedAt: null,
        effectiveDate: parseOptionalDate(form.get("effectiveDate")),
        nextReviewDate: parseOptionalDate(form.get("nextReviewDate")),
        tags: splitList(form.get("tags")), complianceAreas: splitList(form.get("complianceAreas")),
        notes: String(form.get("notes") ?? "").trim() || null,
      } });
      if (updated.templateKey && updated.generatedSections) await syncGeneratedPolicyEvidence(tx, policyEvidenceInput(updated, context.user.id));
      await tx.activityLog.create({ data: {
        organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE",
        recordType: "Policy", recordId: id, summary: `Updated policy: ${title}`,
        beforeValue: { title: current.title, status: current.status },
        afterValue: { title, status },
      } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update policy." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}

function policyEvidenceInput(policy: { id:string; organisationId:string; title:string; category:string; ownerId:string; effectiveDate:Date|null; nextReviewDate:Date|null; status:string; approvalStatus:string; templateKey:string|null; templateVersion:string|null; complianceAreas:string[] }, actorId:string) {
  return { policyId:policy.id, organisationId:policy.organisationId, title:policy.title, category:policy.category, ownerId:policy.ownerId, actorId, effectiveDate:policy.effectiveDate, nextReviewDate:policy.nextReviewDate, status:policy.status, approvalStatus:policy.approvalStatus, templateKey:policy.templateKey!, templateVersion:policy.templateVersion, complianceAreas:policy.complianceAreas };
}
