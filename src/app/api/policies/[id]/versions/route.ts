import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { validatePolicyFile } from "@/lib/policies";
import { deletePolicyFile, putPolicyFile } from "@/lib/policy-storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("document");
  try {
    if (!(file instanceof File)) throw new Error("Choose a policy document.");
    validatePolicyFile(file);
    const versionNumber = String(form.get("versionNumber") ?? "").trim();
    if (!versionNumber || versionNumber.length > 30) throw new Error("Enter a version number.");
    const db = createDb();
    const storageKey = `${context.organisation.id}/${crypto.randomUUID()}`;
    try {
      const policy = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id } });
      if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });
      const bytes = await file.arrayBuffer();
      const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      await putPolicyFile(storageKey, bytes);
      try {
        await db.$transaction(async (tx) => {
          const version = await tx.policyVersion.create({ data: {
            policyId: id, versionNumber, storageKey, fileName: file.name, contentType: file.type,
            sizeBytes: file.size, checksum, changeNotes: String(form.get("changeNotes") ?? "").trim() || null,
            uploadedById: context.user.id,
          } });
          await tx.policy.update({ where: { id }, data: { currentVersionId: version.id, status: "DRAFT", approvalStatus: "NOT_SUBMITTED", approvedById: null, approvedAt: null } });
          await tx.activityLog.create({ data: {
            organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE",
            recordType: "PolicyVersion", recordId: version.id, summary: `Uploaded version ${versionNumber} of ${policy.title}`,
          } });
        });
        return NextResponse.json({ ok: true }, { status: 201 });
      } catch (error) {
        await deletePolicyFile(storageKey);
        throw error;
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload version." }, { status: 400 });
  }
}
