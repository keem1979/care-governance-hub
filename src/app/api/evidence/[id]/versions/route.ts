import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere, validateEvidenceFile } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { deletePrivateFile, putPrivateFile } from "@/lib/private-storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.EVIDENCE_UPLOAD);
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("document");
  const storageKey = `${context.organisation.id}/evidence/${crypto.randomUUID()}`;
  try {
    if (!(file instanceof File)) throw new Error("Choose an evidence file.");
    validateEvidenceFile(file);
    const versionNumber = String(form.get("versionNumber") ?? "").trim();
    if (!versionNumber || versionNumber.length > 30) throw new Error("Enter a version number.");
    const db = createDb();
    try {
      const evidence = await db.evidence.findFirst({ where: { id, ...evidenceScopeWhere(context) } });
      if (!evidence) return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
      if (evidence.relatedModule === "RegisterEntry") return NextResponse.json({ error: "This evidence is updated automatically from its source register record. Attach supporting documents to the register entry instead." }, { status: 409 });
      const canManage = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) || evidence.ownerId === context.user.id || evidence.uploadedById === context.user.id;
      if (!canManage) return NextResponse.json({ error: "You cannot replace this evidence item." }, { status: 403 });
      const bytes = await file.arrayBuffer();
      const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
      await putPrivateFile(storageKey, bytes);
      try {
        await db.$transaction(async (tx) => {
          const version = await tx.evidenceVersion.create({ data: {
            evidenceId: id, versionNumber, storageKey, fileName: file.name, contentType: file.type,
            sizeBytes: file.size, checksum, changeNotes: String(form.get("changeNotes") ?? "").trim() || null,
            uploadedById: context.user.id,
          } });
          await tx.evidence.update({ where: { id }, data: { currentVersionId: version.id } });
          await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: evidence.locationId, userId: context.user.id, action: "UPDATE", recordType: "EvidenceVersion", recordId: version.id, summary: `Uploaded version ${versionNumber} of ${evidence.title}` } });
        });
        return NextResponse.json({ ok: true }, { status: 201 });
      } catch (error) { await deletePrivateFile(storageKey); throw error; }
    } finally { await db.$disconnect(); }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload version." }, { status: 400 });
  }
}
