import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { COMPLAINT_COMMUNICATION_DIRECTIONS, COMPLAINT_COMMUNICATION_TYPES } from "@/lib/complaint-assurance";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { registerScopeWhere } from "@/lib/registers";

const schema = z.object({
  type: z.enum(COMPLAINT_COMMUNICATION_TYPES),
  direction: z.enum(COMPLAINT_COMMUNICATION_DIRECTIONS),
  participants: z.string().trim().min(2).max(1000),
  summary: z.string().trim().min(3).max(5000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const input = schema.parse({ type: String(form.get("type") ?? ""), direction: String(form.get("direction") ?? ""), participants: String(form.get("participants") ?? ""), summary: String(form.get("summary") ?? "") });
    const complaint = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "complaints" }, archivedAt: null }, include: { complaintInvestigation: true, complaintIssues: true } });
    if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    if (complaint.status === "CLOSED") throw new Error("Reopen the Complaint before adding material new communication.");
    const evidenceId = String(form.get("evidenceId") ?? "") || null;
    if (evidenceId && !(await db.evidence.findFirst({ where: { id: evidenceId, ...evidenceScopeWhere(context), status: "ACTIVE" } }))) throw new Error("The selected Evidence is unavailable or outside your authorised scope.");
    const occurredAt = timestamp(form.get("occurredAt"));
    if (input.type === "FINAL_RESPONSE") {
      if (!complaint.complaintInvestigation?.responsePreparedAt || !complaint.complaintInvestigation.responseSummary) throw new Error("Prepare and record the final response before issuing it.");
      if (complaint.complaintIssues.some((issue) => !issue.finding || !issue.reasoning)) throw new Error("Complete every issue finding before issuing the final response.");
      if (["HIGH", "CRITICAL"].includes(complaint.riskLevel) && !complaint.complaintInvestigation.responseApprovedAt) throw new Error("This serious Complaint response requires accountable approval before issue.");
      if (["MEDIUM", "HIGH", "CRITICAL"].includes(complaint.riskLevel) && !evidenceId) throw new Error("Link the governed final-response document for this material Complaint.");
    }
    await db.$transaction(async (tx) => {
      const communication = await tx.complaintCommunication.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, complaintId: id, type: input.type, direction: input.direction, occurredAt, participants: input.participants, summary: input.summary, authorId: context.user.id, evidenceId } });
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: `COMMUNICATION_${input.type}`, snapshot: { communicationId: communication.id, type: input.type, direction: input.direction, occurredAt, participants: input.participants, summary: input.summary, evidenceId } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, userId: context.user.id, action: "CREATE", recordType: "ComplaintCommunication", recordId: communication.id, summary: `${input.type.replaceAll("_", " ")} recorded for ${complaint.reference}`, afterValue: { complaintId: id, type: input.type, direction: input.direction, evidenceId } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add Complaint communication." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function timestamp(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); const parsed = text ? new Date(text) : new Date(); if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid communication date and time."); return parsed; }
