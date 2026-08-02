import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import {
  generatePolicySections,
  POLICY_CATALOGUE,
  POLICY_TEMPLATE_VERSION,
  policyBrandFromOrganisation,
  sourceAnnex,
} from "@/lib/policy-catalogue";
import { syncGeneratedPolicyEvidence } from "@/lib/policy-evidence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const ownerId = String(form.get("ownerId") ?? "").trim();
  const customisationNotes = String(form.get("customisationNotes") ?? "").trim();
  const reviewMonths = Math.min(24, Math.max(1, Number(form.get("reviewMonths") ?? 12) || 12));
  const requestedKeys = form.getAll("templateKeys").map(String);
  const selected = POLICY_CATALOGUE.filter(({ key }) => requestedKeys.includes(key));
  if (selected.length === 0) return NextResponse.json({ error: "Select at least one policy." }, { status: 400 });

  const db = createDb();
  try {
    const [owner, organisation, existing] = await Promise.all([
      db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" }, select: { userId: true } }),
      db.organisation.findUnique({ where: { id: context.organisation.id }, select: { name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyFooterText: true } }),
      db.policy.findMany({ where: { organisationId: context.organisation.id, templateKey: { in: selected.map(({ key }) => key) } }, orderBy: { createdAt: "desc" } }),
    ]);
    if (!owner) return NextResponse.json({ error: "Choose an active policy owner." }, { status: 400 });
    if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
    const existingByKey = new Map<string, (typeof existing)[number]>();
    for (const policy of existing) {
      if (!policy.templateKey) continue;
      const chosen = existingByKey.get(policy.templateKey);
      if (!chosen || (chosen.status === "ARCHIVED" && policy.status !== "ARCHIVED")) existingByKey.set(policy.templateKey, policy);
    }
    const brand = policyBrandFromOrganisation(organisation);
    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewMonths);

    const created = await db.$transaction(async (tx) => {
      const records = [];
      let skipped = 0;
      for (const template of selected) {
        const prior = existingByKey.get(template.key);
        if (prior && prior.status !== "ARCHIVED") {
          await syncGeneratedPolicyEvidence(tx, {
            policyId: prior.id, organisationId: prior.organisationId, title: prior.title,
            category: prior.category, ownerId: prior.ownerId, actorId: context.user.id,
            effectiveDate: prior.effectiveDate, nextReviewDate: prior.nextReviewDate,
            status: prior.status, approvalStatus: prior.approvalStatus,
            templateKey: prior.templateKey!, templateVersion: prior.templateVersion,
            complianceAreas: prior.complianceAreas,
          });
          skipped += 1;
          continue;
        }
        const data = {
            organisationId: context.organisation.id,
            title: template.title,
            category: template.category,
            ownerId,
            createdById: context.user.id,
            nextReviewDate,
            status: "DRAFT" as const,
            approvalStatus: "NOT_SUBMITTED" as const,
            tags: ["premium policy", "source grounded", template.cqcKey.toLowerCase()],
            complianceAreas: template.complianceAreas,
            notes: "Prepared through the ATOM Policy Studio for organisation review, consultation and approval.",
            templateKey: template.key,
            templateVersion: POLICY_TEMPLATE_VERSION,
            generatedSections: generatePolicySections(template, brand),
            sourceAnnex: sourceAnnex(template),
            sourceCheckedAt: new Date("2026-08-01T00:00:00.000Z"),
            customisationNotes: customisationNotes || null,
            archivedAt: null,
        };
        const record = prior
          ? await tx.policy.update({ where: { id: prior.id }, data })
          : await tx.policy.create({ data });
        await syncGeneratedPolicyEvidence(tx, {
          policyId: record.id, organisationId: record.organisationId, title: record.title,
          category: record.category, ownerId: record.ownerId, actorId: context.user.id,
          effectiveDate: record.effectiveDate, nextReviewDate: record.nextReviewDate,
          status: record.status, approvalStatus: record.approvalStatus,
          templateKey: record.templateKey!, templateVersion: record.templateVersion,
          complianceAreas: record.complianceAreas,
        });
        records.push(record);
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "PolicyPack", recordId: context.organisation.id, summary: `Generated or refreshed ${records.length} branded policy draft${records.length === 1 ? "" : "s"}.`, afterValue: { templateVersion: POLICY_TEMPLATE_VERSION, created: records.map(({ id, title }) => ({ id, title })), skippedExisting: skipped } } });
      return { records, skipped };
    });
    return NextResponse.json({ created: created.records.length, skipped: created.skipped, firstId: created.records[0]?.id ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The policy drafts could not be generated." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
