import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import {
  parseOptionalDate,
  POLICY_CATEGORIES,
  splitList,
  validatePolicyFile,
} from "@/lib/policies";
import { deletePolicyFile, putPolicyFile } from "@/lib/policy-storage";

export const runtime = "nodejs";

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const file = form.get("document");
  try {
    if (!(file instanceof File)) throw new Error("Choose a policy document.");
    validatePolicyFile(file);
    const title = text(form, "title");
    const category = text(form, "category");
    const ownerId = text(form, "ownerId");
    const versionNumber = text(form, "versionNumber");
    if (title.length < 3 || title.length > 180) throw new Error("Enter a policy title between 3 and 180 characters.");
    if (!POLICY_CATEGORIES.includes(category as (typeof POLICY_CATEGORIES)[number])) throw new Error("Choose a valid policy category.");
    if (!versionNumber || versionNumber.length > 30) throw new Error("Enter a version number.");

    const db = createDb();
    const storageKey = `${context.organisation.id}/${crypto.randomUUID()}`;
    try {
      const owner = await db.organisationMembership.findFirst({
        where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" },
        select: { userId: true },
      });
      if (!owner) return NextResponse.json({ error: "Choose an active policy owner." }, { status: 400 });

      const bytes = await file.arrayBuffer();
      const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      await putPolicyFile(storageKey, bytes);
      try {
        const policy = await db.$transaction(async (tx) => {
          const created = await tx.policy.create({
            data: {
              organisationId: context.organisation.id,
              title,
              category,
              ownerId,
              createdById: context.user.id,
              effectiveDate: parseOptionalDate(form.get("effectiveDate")),
              nextReviewDate: parseOptionalDate(form.get("nextReviewDate")),
              tags: splitList(form.get("tags")),
              complianceAreas: splitList(form.get("complianceAreas")),
              notes: text(form, "notes") || null,
            },
          });
          const version = await tx.policyVersion.create({
            data: {
              policyId: created.id,
              versionNumber,
              storageKey,
              fileName: file.name,
              contentType: file.type,
              sizeBytes: file.size,
              checksum,
              changeNotes: "Initial version",
              uploadedById: context.user.id,
            },
          });
          await tx.policy.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
          await tx.activityLog.create({
            data: {
              organisationId: context.organisation.id,
              userId: context.user.id,
              action: "CREATE",
              recordType: "Policy",
              recordId: created.id,
              summary: `Created policy: ${title}`,
              afterValue: { title, category, versionNumber },
            },
          });
          return created;
        });
        return NextResponse.json({ id: policy.id }, { status: 201 });
      } catch (error) {
        await deletePolicyFile(storageKey);
        throw error;
      }
    } finally {
      await db.$disconnect();
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create policy." }, { status: 400 });
  }
}
