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
      db.policy.findMany({ where: { organisationId: context.organisation.id, templateKey: { in: selected.map(({ key }) => key) }, status: { not: "ARCHIVED" } }, select: { templateKey: true } }),
    ]);
    if (!owner) return NextResponse.json({ error: "Choose an active policy owner." }, { status: 400 });
    if (!organisation) return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
    const existingKeys = new Set(existing.map(({ templateKey }) => templateKey));
    const toCreate = selected.filter(({ key }) => !existingKeys.has(key));
    const brand = policyBrandFromOrganisation(organisation);
    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + reviewMonths);

    const created = await db.$transaction(async (tx) => {
      const records = [];
      for (const template of toCreate) {
        const record = await tx.policy.create({
          data: {
            organisationId: context.organisation.id,
            title: template.title,
            category: template.category,
            ownerId,
            createdById: context.user.id,
            nextReviewDate,
            status: "DRAFT",
            approvalStatus: "NOT_SUBMITTED",
            tags: ["premium policy", "source grounded", template.cqcKey.toLowerCase()],
            complianceAreas: template.complianceAreas,
            notes: "Controlled draft generated from the QCGMS Policy Studio. Complete local review and approval before use.",
            templateKey: template.key,
            templateVersion: POLICY_TEMPLATE_VERSION,
            generatedSections: generatePolicySections(template, brand),
            sourceAnnex: sourceAnnex(template),
            sourceCheckedAt: new Date("2026-08-01T00:00:00.000Z"),
            customisationNotes: customisationNotes || null,
          },
        });
        records.push(record);
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "PolicyPack", recordId: context.organisation.id, summary: `Generated ${records.length} branded policy draft${records.length === 1 ? "" : "s"}.`, afterValue: { templateVersion: POLICY_TEMPLATE_VERSION, created: records.map(({ id, title }) => ({ id, title })), skippedExisting: selected.length - records.length } } });
      return records;
    });
    return NextResponse.json({ created: created.length, skipped: selected.length - created.length, firstId: created[0]?.id ?? null }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The policy drafts could not be generated." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
