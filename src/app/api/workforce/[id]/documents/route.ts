import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { validateEvidenceFile } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, putPrivateFile } from "@/lib/private-storage";
import { parseOptionalDate } from "@/lib/policies";
import { workforceScopeWhere } from "@/lib/workforce";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE); const { id } = await params; const form = await request.formData(); const document = form.get("document");
  if (!(document instanceof File)) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
  try { validateEvidenceFile(document); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Choose a valid file." }, { status: 400 }); }
  const title = String(form.get("title") ?? "").trim().slice(0, 180); const category = String(form.get("category") ?? "Other"); if (title.length < 3) return NextResponse.json({ error: "Enter a clear document title." }, { status: 400 });
  const db = createDb(); const storageKey = `${context.organisation.id}/evidence/${crypto.randomUUID()}`;
  try {
    const staff = await db.staffMember.findFirst({ where: { id, ...workforceScopeWhere(context) }, select: { id: true, employeeReference: true, firstName: true, lastName: true, locationId: true } }); if (!staff) return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
    const bytes = await document.arrayBuffer(); await putPrivateFile(storageKey, bytes); const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const evidence = await db.$transaction(async (tx) => { const created = await tx.evidence.create({ data: { organisationId: context.organisation.id, locationId: staff.locationId, title: `${staff.employeeReference}: ${title}`.slice(0, 180), description: `Private workforce document for ${staff.firstName} ${staff.lastName}.`, category, evidenceType: category === "Certificates" ? "Certificate" : "Record", sourceType: "UPLOADED_DOCUMENT", sourceName: "Workforce staff profile", sourceReference: staff.employeeReference, ownerId: context.user.id, reviewExpiryDate: parseOptionalDate(form.get("reviewExpiryDate")), tags: ["workforce", "staff-document", staff.employeeReference.toLowerCase()], relatedModule: "StaffMember", relatedRecordId: id, confidentiality: "RESTRICTED", uploadedById: context.user.id } }); const version = await tx.evidenceVersion.create({ data: { evidenceId: created.id, versionNumber: "1.0", storageKey, fileName: document.name, contentType: document.type, sizeBytes: document.size, checksum, changeNotes: "Uploaded from staff profile", uploadedById: context.user.id } }); await tx.evidence.update({ where: { id: created.id }, data: { currentVersionId: version.id } }); await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: staff.locationId, userId: context.user.id, action: "CREATE", recordType: "Evidence", recordId: created.id, summary: `Uploaded workforce evidence: ${title}`, afterValue: { staffMemberId: id, category } } }); return created; });
    return NextResponse.json({ id: evidence.id }, { status: 201 });
  } catch (error) { await deletePrivateFile(storageKey); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload the staff document." }, { status: 400 }); } finally { await db.$disconnect(); }
}
