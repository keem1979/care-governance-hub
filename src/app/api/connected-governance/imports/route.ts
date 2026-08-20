import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/auth/dal";
import { classifyImportRow, hashIntegrationToken, importBatchStatus } from "@/lib/connected-governance";
import { createDb } from "@/lib/db";
import { reconciliationReference } from "@/lib/identity-reconciliation";
import { parseCsv } from "@/lib/kpis";
import { PERMISSIONS } from "@/lib/permissions";

const schema = z.object({ target: z.enum(["CLIENT", "STAFF_MEMBER"]), sourceSystem: z.string().trim().min(2).max(120), connectionId: z.union([z.literal(""), z.uuid()]) });

export async function POST(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.WORKFORCE_MANAGE]), form = await request.formData(), file = form.get("file"), db = createDb();
  try {
    const input = schema.parse(Object.fromEntries(form));
    if (input.target === "STAFF_MEMBER" && !context.permissions.includes(PERMISSIONS.WORKFORCE_MANAGE)) throw new Error("Workforce management permission is required for staff imports.");
    if (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024) throw new Error("Choose a CSV file no larger than 2 MB.");
    const text = await file.text(), checksum = await hashIntegrationToken(text), csv = parseCsv(text), header = csv.shift()?.map(normalHeader) ?? [], required = ["external_id", "first_name", "last_name"];
    if (!required.every((item) => header.includes(item))) throw new Error("CSV must include external_id, first_name and last_name columns.");
    if (input.target === "STAFF_MEMBER" && !header.includes("job_title")) throw new Error("Staff CSV must also include job_title.");
    if (!csv.length || csv.length > 500) throw new Error("Import between 1 and 500 rows at a time.");
    const connection = input.connectionId ? await db.integrationConnection.findFirst({ where: { id: input.connectionId, organisationId: context.organisation.id, status: { in: ["ACTIVE", "PAUSED"] }, archivedAt: null } }) : null;
    if (input.connectionId && !connection) throw new Error("Choose an approved integration connection.");
    const sourceSystem = connection?.key ?? input.sourceSystem, locationScope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] };
    const [identifiers, clients, staff, locations] = await Promise.all([
      db.externalIdentifier.findMany({ where: { organisationId: context.organisation.id, sourceSystem, entityType: input.target }, select: { externalId: true, recordId: true } }),
      input.target === "CLIENT" ? db.client.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...locationScope }, select: { id: true, clientReference: true, firstName: true, lastName: true, email: true, phone: true, dateOfBirth: true } }) : Promise.resolve([]),
      input.target === "STAFF_MEMBER" ? db.staffMember.findMany({ where: { organisationId: context.organisation.id, archivedAt: null, ...locationScope }, select: { id: true, employeeReference: true, firstName: true, lastName: true, workEmail: true, workPhone: true } }) : Promise.resolve([]),
      db.serviceLocation.findMany({ where: { organisationId: context.organisation.id, id: { in: context.locations.map((item) => item.id) }, isActive: true, archivedAt: null }, select: { id: true, code: true, name: true } }),
    ]);
    const identifierMap = new Map(identifiers.map((item) => [normal(item.externalId), item.recordId])), locationCodes = new Set(locations.map((item) => normal(item.code)));
    const analysed = csv.map((row, index) => {
      const value = (name: string) => String(row[header.indexOf(name)] ?? "").trim(), externalId = value("external_id"), firstName = value("first_name"), lastName = value("last_name"), email = value("email"), phone = value("phone"), jobTitle = value("job_title"), locationCode = value("location_code"), dateOfBirth = parseDate(value("date_of_birth"));
      const candidateSource = input.target === "CLIENT" ? clients.map((item) => ({ id: item.id, label: `${item.firstName} ${item.lastName} · ${item.clientReference}`, firstName: item.firstName, lastName: item.lastName, email: item.email, phone: item.phone, dateOfBirth: item.dateOfBirth })) : staff.map((item) => ({ id: item.id, label: `${item.firstName} ${item.lastName} · ${item.employeeReference}`, firstName: item.firstName, lastName: item.lastName, email: item.workEmail, phone: item.workPhone, dateOfBirth: null }));
      const candidates = candidateSource.filter((item) => (email && normal(item.email) === normal(email)) || (normal(item.firstName) === normal(firstName) && normal(item.lastName) === normal(lastName) && ((dateOfBirth && item.dateOfBirth?.toISOString().slice(0, 10) === dateOfBirth.toISOString().slice(0, 10)) || (phone && normalPhone(item.phone) === normalPhone(phone)))));
      const exactRecordId = identifierMap.get(normal(externalId)) ?? null, classification = classifyImportRow({ target: input.target, externalId, firstName, lastName, jobTitle, exactMatch: Boolean(exactRecordId), candidates: candidates.map((item) => item.id) }), messages = [...classification.messages];
      if (locationCode && !locationCodes.has(normal(locationCode))) messages.push("Location code is not authorised or active.");
      const status = messages.some((item) => item.startsWith("Location code")) ? "INVALID" : classification.status;
      return { rowNumber: index + 2, externalId, firstName: firstName || null, lastName: lastName || null, email: email || null, phone: phone || null, dateOfBirth, jobTitle: jobTitle || null, locationCode: locationCode || null, rawPayload: Object.fromEntries(header.map((name, cell) => [name, row[cell] ?? ""])), status, validationMessages: messages, candidateRecordIds: candidates.map((item) => item.id), candidateLabels: candidates.map((item) => item.label), canonicalRecordId: exactRecordId };
    });
    const counts = countRows(analysed), batchStatus = importBatchStatus({ ready: counts.ready, conflicts: counts.conflicts, invalid: counts.invalid, applied: 0, total: analysed.length });
    const batch = await db.$transaction(async (tx) => {
      const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "IMPORT_BATCH" } }, create: { organisationId: context.organisation.id, key: "IMPORT_BATCH", currentValue: 1 }, update: { currentValue: { increment: 1 } } }), reference = `IMP-${new Date().getUTCFullYear()}-${String(counter.currentValue).padStart(5, "0")}`;
      const created = await tx.importBatch.create({ data: { organisationId: context.organisation.id, connectionId: connection?.id ?? null, reference, sourceSystem, target: input.target, originalFileName: file.name.slice(0, 240), checksum, status: batchStatus, totalRows: analysed.length, readyRows: counts.ready, matchedRows: counts.matched, conflictRows: counts.conflicts, invalidRows: counts.invalid, createdById: context.user.id } });
      for (const row of analysed) {
        let reconciliationCaseId: string | null = null;
        if (row.status === "POTENTIAL_MATCH") {
          const fingerprint = await hashIntegrationToken(`${context.organisation.id}:${created.id}:${row.rowNumber}:${row.externalId}`), dqCounter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "DATA_QUALITY" } }, create: { organisationId: context.organisation.id, key: "DATA_QUALITY", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
          const reconciliation = await tx.reconciliationCase.create({ data: { organisationId: context.organisation.id, reference: reconciliationReference(dqCounter.currentValue), fingerprint, entityType: input.target, reason: "DUPLICATE_IDENTITY", candidateRecordIds: row.candidateRecordIds, candidateLabels: row.candidateLabels, matchSignals: ["Import identity match"], summary: `Import row ${row.rowNumber} may match an existing ${input.target === "CLIENT" ? "client" : "staff"} record. Human reconciliation is required before creation.` } }); reconciliationCaseId = reconciliation.id;
        }
        await tx.importRow.create({ data: { organisationId: context.organisation.id, batchId: created.id, ...row, rawPayload: row.rawPayload as never, status: row.status as never, reconciliationCaseId } });
      }
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "ImportBatch", recordId: created.id, summary: `Staged ${reference} from ${sourceSystem}; no canonical records changed`, afterValue: { target: input.target, totalRows: analysed.length, ...counts, automaticCanonicalChanges: 0, checksum } } });
      return created;
    });
    return NextResponse.json({ id: batch.id, reference: batch.reference, status: batch.status, ...counts }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not stage the import." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function normalHeader(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function normal(value: unknown) { return String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " "); }
function normalPhone(value: unknown) { return String(value ?? "").replace(/[^0-9+]/g, "").replace(/^00/, "+"); }
function parseDate(value: string) { if (!value) return null; const date = new Date(`${value}T00:00:00.000Z`); return Number.isNaN(date.getTime()) ? null : date; }
function countRows(rows: Array<{ status: string }>) { return { ready: rows.filter((row) => row.status === "READY_TO_CREATE").length, matched: rows.filter((row) => row.status === "EXACT_MATCH").length, conflicts: rows.filter((row) => row.status === "POTENTIAL_MATCH").length, invalid: rows.filter((row) => row.status === "INVALID").length }; }
