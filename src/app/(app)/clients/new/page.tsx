import Link from "next/link";
import { ClientForm } from "@/components/client-form";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewClientPage(){const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);return <main className="mx-auto max-w-4xl space-y-5"><div><Link href="/clients" className="text-sm font-semibold text-emerald-700">← Client Directory</Link><h1 className="mt-2 text-3xl font-bold">Add client record</h1><p className="mt-1 text-slate-600">Create the person’s governance profile, then start assessments and reviews from their record.</p></div><ClientForm locations={context.locations.map(({id,name})=>({id,name}))}/></main>}
