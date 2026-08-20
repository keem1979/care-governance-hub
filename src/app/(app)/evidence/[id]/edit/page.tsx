import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EvidenceForm } from "@/components/evidence-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

const dateInput = (value: Date | null) => value?.toISOString().slice(0,10) ?? "";
export default async function EditEvidencePage({ params }: { params: Promise<{ id:string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const {id} = await params; const db = createDb();
  try {
    const [item,memberships,policies] = await Promise.all([
      db.evidence.findFirst({where:{id,...evidenceScopeWhere(context)}}),
      db.organisationMembership.findMany({where:{organisationId:context.organisation.id,status:"ACTIVE"},select:{user:{select:{id:true,name:true}}},orderBy:{user:{name:"asc"}}}),
      db.policy.findMany({where:{organisationId:context.organisation.id,status:{not:"ARCHIVED"}},select:{id:true,title:true},orderBy:{title:"asc"}}),
    ]);
    if (!item) notFound();
    if (item.relatedModule === "RegisterEntry") redirect(`/evidence/${id}`);
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href={`/evidence/${id}`} className="text-sm font-semibold text-emerald-700">← Back to evidence</Link><h1 className="mt-2 text-3xl font-bold">Edit evidence details</h1></div><EvidenceForm owners={memberships.map(({user})=>user)} locations={context.locations.map((location)=>({id:location.id,name:location.name}))} policies={policies} initial={{id:item.id,title:item.title,description:item.description??"",category:item.category,evidenceType:item.evidenceType,ownerId:item.ownerId,locationId:item.locationId??"",evidenceDate:dateInput(item.evidenceDate),reviewExpiryDate:dateInput(item.reviewExpiryDate),tags:item.tags.join(", "),relatedModule:item.relatedModule??"",relatedRecordId:item.relatedRecordId??"",confidentiality:item.confidentiality,status:item.status,notes:item.notes??"",sourceType:item.sourceType,sourceName:item.sourceName??"",sourceReference:item.sourceReference??"",sourceUrl:item.sourceUrl??"",originalAuthor:item.originalAuthor??"",capturedAt:dateInput(item.capturedAt),provenanceNote:item.provenanceNote??""}} /></main>;
  } finally { await db.$disconnect(); }
}
