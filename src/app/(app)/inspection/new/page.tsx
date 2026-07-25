import Link from "next/link";
import { InspectionRequirementForm } from "@/components/inspection-requirement-form";
import { requirePermission } from "@/lib/auth/dal";
import { getInspectionFormOptions } from "@/lib/inspection-data";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewInspectionRequirementPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const options = await getInspectionFormOptions(context);
  return <main className="mx-auto max-w-5xl space-y-5"><div><Link href="/inspection" className="text-sm font-semibold text-emerald-700">Back to Inspection Centre</Link><h1 className="mt-2 text-3xl font-bold">Add evidence requirement</h1><p className="mt-1 text-slate-600">Create an internal requirement and map the records that demonstrate assurance.</p></div><InspectionRequirementForm {...options} /></main>;
}
