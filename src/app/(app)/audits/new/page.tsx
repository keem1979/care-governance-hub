import Link from "next/link";
import { AuditStartForm } from "@/components/audit-start-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
export default async function NewAuditPage({searchParams}:{searchParams:Promise<{template?:string}>}){const context=await requirePermission(PERMISSIONS.AUDITS_COMPLETE);const {template}=await searchParams;const db=createDb();const templates=await db.auditTemplate.findMany({where:{isPublished:true,OR:[{organisationId:null},{organisationId:context.organisation.id}]},select:{id:true,name:true,version:true},orderBy:{name:"asc"}}).finally(()=>db.$disconnect());return <main className="mx-auto max-w-4xl space-y-5"><div><Link href="/audits" className="text-sm font-semibold text-emerald-700">← Audit Centre</Link><h1 className="mt-2 text-3xl font-bold">Start an audit</h1><p className="mt-1 text-slate-600">Choose a versioned template and define the review scope.</p></div><AuditStartForm templates={templates} locations={context.locations.map((item)=>({id:item.id,name:item.name}))} selectedTemplate={template}/></main>}
