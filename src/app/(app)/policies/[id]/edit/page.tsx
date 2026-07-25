import Link from "next/link";
import { notFound } from "next/navigation";
import { PolicyForm } from "@/components/policy-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

function dateInput(date: Date | null) { return date?.toISOString().slice(0, 10) ?? ""; }

export default async function EditPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    const [policy, memberships] = await Promise.all([
      db.policy.findFirst({ where: { id, organisationId: context.organisation.id } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
    ]);
    if (!policy) notFound();
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href={`/policies/${id}`} className="text-sm font-semibold text-emerald-700">← Back to policy</Link><h1 className="mt-2 text-3xl font-bold">Edit policy details</h1></div><PolicyForm owners={memberships.map(({ user }) => user)} initial={{
      id: policy.id, title: policy.title, category: policy.category, ownerId: policy.ownerId, status: policy.status,
      effectiveDate: dateInput(policy.effectiveDate), nextReviewDate: dateInput(policy.nextReviewDate),
      tags: policy.tags.join(", "), complianceAreas: policy.complianceAreas.join(", "), notes: policy.notes ?? "",
    }} /></main>;
  } finally { await db.$disconnect(); }
}
