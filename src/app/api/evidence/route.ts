import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import {
  EVIDENCE_CATEGORIES, EVIDENCE_CONFIDENTIALITY, EVIDENCE_TYPES, MAX_EVIDENCE_FILES,
  titleFromFileName, validateEvidenceFile,
} from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate, splitList } from "@/lib/policies";
import { deletePrivateFile, putPrivateFile } from "@/lib/private-storage";
import { evidenceRequirementByKey } from "@/lib/evidence-requirements";
import { EVIDENCE_SOURCE_TYPES } from "@/lib/evidence-assurance";

function text(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
async function checksum(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.EVIDENCE_UPLOAD);
  const form = await request.formData();
  const files = form.getAll("documents").filter((item): item is File => item instanceof File && item.size > 0);
  const storedKeys: string[] = [];
  try {
    if (!files.length) throw new Error("Choose at least one evidence file.");
    if (files.length > MAX_EVIDENCE_FILES) throw new Error("Upload no more than 10 files at once.");
    files.forEach(validateEvidenceFile);
    const category = text(form, "category");
    const evidenceType = text(form, "evidenceType");
    const confidentiality = text(form, "confidentiality");
    const ownerId = text(form, "ownerId");
    const locationId = text(form, "locationId") || null;
    if (!EVIDENCE_CATEGORIES.includes(category as never)) throw new Error("Choose a valid evidence category.");
    if (!EVIDENCE_TYPES.includes(evidenceType as never)) throw new Error("Choose a valid evidence type.");
    if (!EVIDENCE_CONFIDENTIALITY.includes(confidentiality as never)) throw new Error("Choose a confidentiality level.");
    if (locationId && !context.locations.some((location) => location.id === locationId)) throw new Error("Choose an authorised service location.");

    const db = createDb();
    try {
      const owner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } });
      if (!owner) throw new Error("Choose an active record owner.");
      const relatedModule = text(form, "relatedModule") || null;
      const relatedRecordId = text(form, "relatedRecordId") || null;
      if (relatedModule === "Policy" && relatedRecordId) {
        const policy = await db.policy.findFirst({ where: { id: relatedRecordId, organisationId: context.organisation.id }, select: { id: true } });
        if (!policy) throw new Error("The related policy could not be found.");
      }
      if (relatedModule === "EvidenceRequirement" && !evidenceRequirementByKey(relatedRecordId)) throw new Error("The evidence requirement could not be found.");
      const sourceType = text(form, "sourceType");
      const sourceName = text(form, "sourceName");
      const sourceUrl = text(form, "sourceUrl") || null;
      if (!EVIDENCE_SOURCE_TYPES.includes(sourceType as never) || sourceName.length < 2) throw new Error("Record a valid evidence source type and source organisation or system.");
      if (sourceUrl && (!sourceUrl.startsWith("https://") || !URL.canParse(sourceUrl))) throw new Error("Source links must be valid HTTPS URLs.");

      const createdIds: string[] = [];
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const storageKey = `${context.organisation.id}/evidence/${crypto.randomUUID()}`;
        await putPrivateFile(storageKey, bytes);
        storedKeys.push(storageKey);
        const suppliedTitle = text(form, "title");
        const title = files.length === 1 && suppliedTitle ? suppliedTitle : titleFromFileName(file.name);
        const evidence = await db.$transaction(async (tx) => {
          const created = await tx.evidence.create({ data: {
            organisationId: context.organisation.id, locationId, title,
            description: text(form, "description") || null, category, evidenceType, ownerId,
            evidenceDate: parseOptionalDate(form.get("evidenceDate")),
            reviewExpiryDate: parseOptionalDate(form.get("reviewExpiryDate")),
            tags: splitList(form.get("tags")), relatedModule, relatedRecordId,
            confidentiality: confidentiality as "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED",
            notes: text(form, "notes") || null, uploadedById: context.user.id,
            sourceType: sourceType as never, sourceName, sourceReference: text(form, "sourceReference") || null,
            sourceUrl, originalAuthor: text(form, "originalAuthor") || null,
            capturedAt: parseOptionalDate(form.get("capturedAt")), provenanceNote: text(form, "provenanceNote") || null,
          } });
          const version = await tx.evidenceVersion.create({ data: {
            evidenceId: created.id, versionNumber: "1.0", storageKey, fileName: file.name,
            contentType: file.type, sizeBytes: file.size, checksum: await checksum(bytes),
            changeNotes: "Initial upload", uploadedById: context.user.id,
          } });
          await tx.evidence.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
          await tx.activityLog.create({ data: {
            organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE",
            recordType: "Evidence", recordId: created.id, summary: `Uploaded evidence: ${title}`,
            afterValue: { title, category, evidenceType, version: "1.0", relatedModule, relatedRecordId, sourceType, sourceName },
          } });
          return created;
        });
        createdIds.push(evidence.id);
      }
      return NextResponse.json({ ids: createdIds, id: createdIds[0] }, { status: 201 });
    } finally { await db.$disconnect(); }
  } catch (error) {
    await Promise.allSettled(storedKeys.map(deletePrivateFile));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not upload evidence." }, { status: 400 });
  }
}
