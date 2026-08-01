import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { CLIENT_STATUSES } from "@/lib/clients";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const clientReference = clean(form.get("clientReference"), 40), firstName = clean(form.get("firstName"), 80), lastName = clean(form.get("lastName"), 80);
  const locationId = optional(form.get("locationId"), 40), status = clean(form.get("status"), 30);
  if (!clientReference || firstName.length < 2 || lastName.length < 2) return NextResponse.json({ error: "Enter the client reference, first name and last name." }, { status: 400 });
  if (!CLIENT_STATUSES.includes(status as never)) return NextResponse.json({ error: "Choose a valid client status." }, { status: 400 });
  if (locationId && !context.locations.some(({ id }) => id === locationId)) return NextResponse.json({ error: "Choose an authorised service location." }, { status: 400 });
  const data = {
    organisationId: context.organisation.id, locationId, clientReference, firstName, lastName, status: status as never,
    preferredName: optional(form.get("preferredName"),80), pronouns: optional(form.get("pronouns"),50), dateOfBirth: parseOptionalDate(form.get("dateOfBirth")),
    phone: optional(form.get("phone"),40), email: optional(form.get("email"),160), addressLine: optional(form.get("addressLine"),200), town: optional(form.get("town"),100), postcode: optional(form.get("postcode"),20), commissionerReference: optional(form.get("commissionerReference"),80), serviceStartDate: parseOptionalDate(form.get("serviceStartDate")), communicationSummary: optional(form.get("communicationSummary"),1500), emergencyContact: optional(form.get("emergencyContact"),1000),
  };
  const db=createDb(); try {
    const client=await db.$transaction(async(tx)=>{const created=await tx.client.create({data});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId,userId:context.user.id,action:"CREATE",recordType:"Client",recordId:created.id,summary:`Added client directory record: ${clientReference}`,afterValue:{clientReference,status}}});return created;});
    return NextResponse.json({id:client.id},{status:201});
  } catch(error){return NextResponse.json({error:error instanceof Error&&error.message.includes("Unique constraint")?"That client reference is already in use.":"Could not add the client record."},{status:400});} finally {await db.$disconnect();}
}
function clean(value:FormDataEntryValue|null,limit:number){return String(value??"").trim().slice(0,limit)}
function optional(value:FormDataEntryValue|null,limit:number){return clean(value,limit)||null}
