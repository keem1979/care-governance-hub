import Link from "next/link";
import { StaffMemberForm } from "@/components/workforce-forms";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewStaffMemberPage() {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE);
  return (
    <main className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/workforce" className="text-sm font-semibold text-emerald-700">
          ← Staff Compliance & Competency
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Add a staff member</h1>
        <p className="mt-1 text-slate-600">
          Create the workforce record first, then add checks, training and
          competencies.
        </p>
      </div>
      <StaffMemberForm
        locations={context.locations.map(({ id, name }) => ({ id, name }))}
      />
    </main>
  );
}
