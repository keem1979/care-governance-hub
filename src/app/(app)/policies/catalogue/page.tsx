import Link from "next/link";
import { PolicyStudio } from "@/components/policy-studio";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { POLICY_CATALOGUE, sourceAnnex } from "@/lib/policy-catalogue";

export default async function PolicyCataloguePage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const db = createDb();
  const [organisation, members, existing] = await Promise.all([
    db.organisation.findUniqueOrThrow({ where: { id: context.organisation.id }, select: { name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyFooterText: true, policyLogoFileName: true, policyLogoUploadedAt: true } }),
    db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { userId: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    db.policy.findMany({ where: { organisationId: context.organisation.id, templateKey: { not: null }, status: { not: "ARCHIVED" } }, select: { templateKey: true } }),
  ]).finally(() => db.$disconnect());
  const existingKeys = new Set(existing.map(({ templateKey }) => templateKey));
  return <main className="space-y-5"><Link href="/policies" className="inline-flex text-sm font-bold text-emerald-800">← Policy Library</Link><PolicyStudio brand={{ ...organisation, policyBrandName: organisation.policyBrandName ?? organisation.name, policyLogoUploadedAt: organisation.policyLogoUploadedAt?.toISOString() ?? null }} canBrand={hasPermission(context.permissions, PERMISSIONS.ORGANISATION_MANAGE)} members={members.map(({ userId, user }) => ({ id: userId, name: user.name }))} templates={POLICY_CATALOGUE.map((template) => ({ key: template.key, title: template.title, category: template.category, cqcKey: template.cqcKey, purpose: template.purpose, sourceCount: sourceAnnex(template).length, exists: existingKeys.has(template.key) }))} /></main>;
}
