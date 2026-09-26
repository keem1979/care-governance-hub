import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { assertRegisterWriteScope, registerScopeWhere } from "@/lib/registers";

const text = z.string().max(10_000).default("");
const sourceId = z.string().uuid().or(z.literal("")).default("");
const schema = z.object({
  status: z.enum(["DRAFT", "TRIAGED", "REFERRED", "ENQUIRY_IN_PROGRESS", "AWAITING_EXTERNAL_RESPONSE", "READY_FOR_ASSURANCE"]),
  safetyPosition: z.enum(["SAFE_NOW", "CONTROLLED_IMMEDIATE_RISK", "UNRESOLVED_IMMEDIATE_RISK", "UNKNOWN_EVIDENCE_REQUIRED"]),
  immediateControl: text,
  triageRationale: text,
  referralDecision: z.enum(["AWAITING_DECISION", "REQUIRED", "MADE", "NOT_REQUIRED"]),
  externalReference: z.string().max(500).default(""),
  externalResponseStatus: text,
  investigationQuestion: text,
  investigationSummary: text,
  peopleConsulted: text,
  findings: text,
  outcome: text,
  externalDependencies: text,
  learning: text,
  affectedRecordsReviewed: text,
  recurrenceReview: text,
  noFurtherActionRationale: text,
  investigatorId: z.string().uuid(),
  originatingIncidentId: sourceId,
  originatingComplaintId: sourceId,
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    // Scope and lifecycle checks deliberately precede payload validation. A closed
    // record must always fail with the governed reopen instruction and must not
    // expose field-validation detail to an out-of-scope caller.
    const record = await db.registerEntry.findFirst({
      where: { id, ...registerScopeWhere(context), definition: { key: "safeguarding" }, archivedAt: null },
      include: { safeguardingCase: true },
    });
    if (!record) return NextResponse.json({ error: "Safeguarding record not found." }, { status: 404 });
    assertRegisterWriteScope(context, record.locationId);
    if (record.status === "CLOSED") throw new Error("Reopen the safeguarding record before adding material changes.");

    const input = schema.parse(Object.fromEntries([...form.entries()].filter(([key]) => !["concernCategories", "referredTo", "referralDate", "externalResponseDueAt"].includes(key))));
    if (input.status === "READY_FOR_ASSURANCE" && record.riskLevel === "UNASSESSED") throw new Error("Assess the safeguarding risk before marking the enquiry ready for assurance.");
    const concernCategories = form.getAll("concernCategories").map(String).filter(Boolean);
    const referredTo = form.getAll("referredTo").map(String).filter(Boolean);
    const referralDate = parseDate(form.get("referralDate"));
    const externalResponseDueAt = parseDate(form.get("externalResponseDueAt"));
    if (input.referralDecision === "MADE" && (!referralDate || !referredTo.length)) throw new Error("Record the referral date and destination when a referral has been made.");
    if (input.originatingIncidentId) await assertSource(db, context, input.originatingIncidentId, "incidents");
    if (input.originatingComplaintId) await assertSource(db, context, input.originatingComplaintId, "complaints");

    const values = {
      organisationId: context.organisation.id,
      locationId: record.locationId,
      status: input.status,
      safetyPosition: input.safetyPosition,
      immediateControl: nullish(input.immediateControl),
      concernCategories,
      triageRationale: nullish(input.triageRationale),
      referralDecision: input.referralDecision,
      referredTo,
      referralDate,
      externalReference: nullish(input.externalReference),
      externalResponseDueAt,
      externalResponseStatus: nullish(input.externalResponseStatus),
      investigationQuestion: nullish(input.investigationQuestion),
      investigationSummary: nullish(input.investigationSummary),
      peopleConsulted: nullish(input.peopleConsulted),
      findings: nullish(input.findings),
      outcome: nullish(input.outcome),
      externalDependencies: nullish(input.externalDependencies),
      learning: nullish(input.learning),
      affectedRecordsReviewed: nullish(input.affectedRecordsReviewed),
      recurrenceReview: nullish(input.recurrenceReview),
      noFurtherActionRationale: nullish(input.noFurtherActionRationale),
      originatingIncidentId: input.originatingIncidentId || null,
      originatingComplaintId: input.originatingComplaintId || null,
      investigatorId: input.investigatorId,
      completedAt: input.status === "READY_FOR_ASSURANCE" ? new Date() : null,
    };

    await db.$transaction(async (tx) => {
      const saved = await tx.safeguardingCase.upsert({ where: { safeguardingId: id }, create: { safeguardingId: id, ...values }, update: values });
      await tx.registerEntry.update({ where: { id }, data: { status: input.status === "READY_FOR_ASSURANCE" ? "IN_REVIEW" : record.status === "OPEN" && input.status !== "DRAFT" ? "IN_REVIEW" : record.status } });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: "SAFEGUARDING_PROGRESS_UPDATED", snapshot: { caseId: saved.id, status: input.status, safetyPosition: input.safetyPosition, referralDecision: input.referralDecision, concernCategories, referredTo, originatingIncidentId: values.originatingIncidentId, originatingComplaintId: values.originatingComplaintId } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: record.locationId, userId: context.user.id, action: "UPDATE", recordType: "SafeguardingCase", recordId: saved.id, summary: `Updated safeguarding progress for ${record.reference}` } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update safeguarding progress." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}

async function assertSource(db: ReturnType<typeof createDb>, context: Awaited<ReturnType<typeof requirePermission>>, id: string, key: string) {
  const found = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key }, archivedAt: null }, select: { id: true } });
  if (!found) throw new Error(`The linked ${key.slice(0, -1)} is unavailable or outside your authorised scope.`);
}

function nullish(value: string) { return value.trim() || null; }
function parseDate(value: FormDataEntryValue | null) {
  const textValue = String(value ?? "").trim();
  if (!textValue) return null;
  const parsed = new Date(textValue);
  if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid date.");
  return parsed;
}
