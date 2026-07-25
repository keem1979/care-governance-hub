import Link from "next/link";
import { PolicyForm } from "@/components/policy-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewPolicyPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const db = createDb();
  const owners = await db.organisationMembership.findMany({
    where: { organisationId: context.organisation.id, status: "ACTIVE" },
    select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } },
  }).finally(() => db.$disconnect());
  return <main className="mx-auto max-w-4xl space-y-5">
    <div><Link href="/policies" className="text-sm font-semibold text-emerald-700">← Policy Library</Link>
      <h1 className="mt-2 text-3xl font-bold">Add a policy</h1><p className="mt-1 text-slate-600">Create the register entry and upload its first controlled document.</p>
    </div>
    <PolicyForm owners={owners.map(({ user }) => user)} />
  </main>;
}
