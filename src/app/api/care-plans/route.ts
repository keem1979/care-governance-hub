import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { ensureCarePlanActions } from "@/lib/care-plan-actions";
import { CARE_PLAN_SCHEMA_VERSION, makeCarePlanReference, parseCarePlanSnapshot, validateCarePlan } from "@/lib/care-plans";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData(); const db = createDb();
  try {
    const data = fields(form), snapshot = parseSnapshot(form), evidenceIds = unique(form, "evidenceIds"), staffIds = unique(form, "staffIds");
    validateCarePlan({ snapshot, clientId: data.clientId, locationId: data.locationId, careCoordinatorId: data.careCoordinatorId, registeredManagerId: data.registeredManagerId, nextReviewDate: data.nextReviewDate });
    await validateLinks(db, context, { ...data, evidenceIds, staffIds });
    const reference = data.reference || makeCarePlanReference();
    const plan = await db.$transaction(async (tx) => {
      const created = await tx.carePlan.create({ data: { organisationId: context.organisation.id, locationId: data.locationId, clientId: data.clientId!, reference, currentVersionNumber: 1, status: data.status as never, overallRisk: data.overallRisk as never, nextReviewDate: date(data.nextReviewDate), careCoordinatorId: data.careCoordinatorId, registeredManagerId: data.registeredManagerId, serviceType: data.serviceType, fundingType: data.fundingType, localAuthorityCode: data.localAuthorityCode, localAuthorityName: data.localAuthorityName, commissioner: data.commissioner } });
      const version = await tx.carePlanVersion.create({ data: { carePlanId: created.id, versionNumber: 1, status: "DRAFT", schemaVersion: CARE_PLAN_SCHEMA_VERSION, snapshot: snapshot as Prisma.InputJsonValue, reason: data.reason, nextReviewDate: date(data.nextReviewDate), createdById: context.user.id, evidenceLinks: { create: evidenceIds.map((evidenceId) => ({ evidenceId })) } } });
      const linkedActionIds = await ensureCarePlanActions(tx, { carePlanId: created.id, organisationId: context.organisation.id, locationId: data.locationId, clientId: data.clientId!, ownerId: data.careCoordinatorId!, actorId: context.user.id, reference, snapshot, existingIds: [] });
      await tx.carePlan.update({ where: { id: created.id }, data: { currentVersionId: version.id, linkedActionIds, status: linkedActionIds.length ? "AWAITING_APPROVAL" : data.status as never, assignments: { create: staffIds.map((staffMemberId) => ({ staffMemberId })) } } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: data.locationId, userId: context.user.id, action: "CREATE", recordType: "CarePlan", recordId: created.id, summary: `Created care plan ${reference}`, afterValue: { version: 1, status: data.status, evidenceCount: evidenceIds.length, assignedStaff: staffIds.length } } });
      return created;
    });
    return NextResponse.json({ id: plan.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the care plan." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

export const carePlanApiHelpers = { fields, parseSnapshot, unique, validateLinks };
function fields(form: FormData) { return { reference: text(form,"reference"), clientId: nullable(form,"clientId"), locationId: nullable(form,"locationId"), careCoordinatorId: nullable(form,"careCoordinatorId"), registeredManagerId: nullable(form,"registeredManagerId"), nextReviewDate: text(form,"nextReviewDate"), serviceType: text(form,"serviceType")||null, fundingType: text(form,"fundingType")||null, localAuthorityCode: text(form,"localAuthorityCode")||null, localAuthorityName: text(form,"localAuthorityName")||null, commissioner: text(form,"commissioner")||null, overallRisk: text(form,"overallRisk")||"LOW", status: text(form,"status")||"DRAFT", reason: text(form,"reason")||"Care plan update" }; }
function parseSnapshot(form:FormData){try{return{...parseCarePlanSnapshot(JSON.parse(text(form,"snapshot"))),schemaVersion:CARE_PLAN_SCHEMA_VERSION};}catch{throw new Error("The structured care-plan data could not be read. Please refresh and try again.");}}
function unique(form:FormData,key:string){return[...new Set(form.getAll(key).map(String).filter(Boolean))];}
async function validateLinks(db:ReturnType<typeof createDb>,context:Awaited<ReturnType<typeof requirePermission>>,input:ReturnType<typeof fields>&{evidenceIds:string[];staffIds:string[]}){
  if(input.locationId&&!context.locations.some((item)=>item.id===input.locationId))throw new Error("Choose an authorised service location.");
  if(input.clientId&&!(await db.client.findFirst({where:{id:input.clientId,...clientScopeWhere(context)},select:{id:true}})))throw new Error("Choose an authorised person record.");
  const users=[input.careCoordinatorId,input.registeredManagerId].filter(Boolean) as string[];if(users.length&&await db.organisationMembership.count({where:{organisationId:context.organisation.id,userId:{in:users},status:"ACTIVE"}})!==new Set(users).size)throw new Error("Choose active organisation members for accountable roles.");
  if(input.evidenceIds.length&&await db.evidence.count({where:{id:{in:input.evidenceIds},...evidenceScopeWhere(context)}})!==input.evidenceIds.length)throw new Error("One or more evidence links are not authorised.");
  if(input.staffIds.length&&await db.staffMember.count({where:{id:{in:input.staffIds},organisationId:context.organisation.id,archivedAt:null}})!==input.staffIds.length)throw new Error("One or more staff assignments are not authorised.");
}
function text(form:FormData,key:string){return String(form.get(key)??"").trim();} function nullable(form:FormData,key:string){return text(form,key)||null;} function date(value:string){const parsed=new Date(`${value}T12:00:00.000Z`);return Number.isNaN(parsed.getTime())?null:parsed;}
