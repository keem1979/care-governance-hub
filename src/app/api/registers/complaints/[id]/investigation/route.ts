import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { COMPLAINT_FINDINGS, COMPLAINT_LEARNING_SCOPES } from "@/lib/complaint-assurance";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { assertRegisterWriteScope, registerScopeWhere } from "@/lib/registers";

const schema = z.object({
  intent: z.enum(["draft", "complete", "approve-response"]),
  complainantName: z.string().max(300), complainantRelationship: z.string().max(500), representationAuthority: z.string().max(2000),
  contactPreference: z.string().max(200), accessibilityNeeds: z.string().max(3000), category: z.string().max(200),
  immediateSafetyConcern: z.string().max(500), immediateSafetyResponse: z.string().max(5000), safeguardingDecision: z.string().max(3000), incidentDecision: z.string().max(3000),
  triageSummary: z.string().max(5000), investigationApproach: z.string().max(5000), evidenceSources: z.string().max(5000), complainantInvolvement: z.string().max(5000),
  investigationOutcome: z.string().max(5000), remedy: z.string().max(5000), learning: z.string().max(5000), affectedRecordsReviewed: z.string().max(5000), recurrenceReview: z.string().max(5000), noFurtherActionRationale: z.string().max(5000),
  extensionReason: z.string().max(3000), responseSummary: z.string().max(5000), complainantSatisfaction: z.string().max(200), satisfactionComment: z.string().max(3000),
});

const APPROVER_ROLES = new Set<string>([ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL, ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.QUALITY_MANAGER]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const input = schema.parse(Object.fromEntries([...schema.keyof().options].map((key) => [key, String(form.get(key) ?? "").trim()])));
    const complaint = await db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "complaints" }, archivedAt: null }, include: { complaintInvestigation: true, complaintIssues: { include: { evidenceLinks: true }, orderBy: { sequence: "asc" } } } });
    if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    assertRegisterWriteScope(context, complaint.locationId);
    if (complaint.status === "CLOSED") throw new Error("Reopen the Complaint through its recorded assurance decision before changing the investigation.");
    if (input.intent !== "draft" && complaint.riskLevel === "UNASSESSED") throw new Error("Assess the Complaint risk before completing or approving its response.");
    const investigatorId = String(form.get("investigatorId") ?? "") || complaint.ownerId || context.user.id;
    if (!(await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: investigatorId, status: "ACTIVE" } }))) throw new Error("Choose an active investigator in this organisation.");
    const issues = parseIssues(form);
    if (issues.some((issue) => issue.id && !complaint.complaintIssues.some((existing) => existing.id === issue.id))) throw new Error("A Complaint issue is outside this governed record.");
    const evidenceIds = [...new Set(issues.flatMap((issue) => issue.evidenceIds))];
    const availableEvidence = evidenceIds.length ? await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context), status: "ACTIVE" } }) : 0;
    if (availableEvidence !== evidenceIds.length) throw new Error("One or more issue Evidence records are unavailable or outside your authorised scope.");
    if (["complete", "approve-response"].includes(input.intent)) validateCompletion(input, issues);
    if (input.intent === "approve-response") {
      if (!APPROVER_ROLES.has(context.role.key)) throw new Error("Your provider role is not authorised to approve a Complaint response.");
      if (complaint.riskLevel === "CRITICAL" && (context.user.id === investigatorId || context.user.id === complaint.complaintInvestigation?.investigatorId)) throw new Error("A Critical Complaint response requires approval by an authorised person other than its investigator.");
      if (!date(form.get("responsePreparedAt")) || !input.responseSummary) throw new Error("Record the prepared response date and summary before approval.");
    }
    const learningScopes = form.getAll("learningScopes").map(String).filter((value): value is typeof COMPLAINT_LEARNING_SCOPES[number] => COMPLAINT_LEARNING_SCOPES.includes(value as never));
    const now = new Date();
    await db.$transaction(async (tx) => {
      const existing = complaint.complaintInvestigation;
      const common = {
        organisationId: context.organisation.id, locationId: complaint.locationId, complainantName: nullable(input.complainantName), complainantRelationship: nullable(input.complainantRelationship), representationAuthority: nullable(input.representationAuthority), contactPreference: nullable(input.contactPreference), accessibilityNeeds: nullable(input.accessibilityNeeds), category: nullable(input.category), immediateSafetyConcern: nullable(input.immediateSafetyConcern), immediateSafetyResponse: nullable(input.immediateSafetyResponse), safeguardingDecision: nullable(input.safeguardingDecision), incidentDecision: nullable(input.incidentDecision), triageSummary: nullable(input.triageSummary), acknowledgementDueAt: date(form.get("acknowledgementDueAt")), responseDueAt: date(form.get("responseDueAt")), extensionDueAt: date(form.get("extensionDueAt")), extensionReason: nullable(input.extensionReason), investigationApproach: nullable(input.investigationApproach), evidenceSources: nullable(input.evidenceSources), complainantInvolvement: nullable(input.complainantInvolvement), investigationOutcome: nullable(input.investigationOutcome), remedy: nullable(input.remedy), learning: nullable(input.learning), learningScopes, affectedRecordsReviewed: nullable(input.affectedRecordsReviewed), recurrenceReview: nullable(input.recurrenceReview), noFurtherActionRationale: nullable(input.noFurtherActionRationale), responsePreparedAt: date(form.get("responsePreparedAt")), responseSummary: nullable(input.responseSummary), findingsCommunicated: choice(form.get("findingsCommunicated")), remedyCommunicated: choice(form.get("remedyCommunicated")), learningCommunicated: choice(form.get("learningCommunicated")), escalationRightsConfirmed: choice(form.get("escalationRightsConfirmed")), complainantSatisfaction: nullable(input.complainantSatisfaction), satisfactionComment: nullable(input.satisfactionComment), investigatorId,
        status: input.intent === "draft" ? "DRAFT" as const : "COMPLETED" as const,
        completedById: input.intent === "draft" ? null : context.user.id,
        completedAt: input.intent === "draft" ? null : existing?.completedAt ?? now,
        responseApprovedById: input.intent === "approve-response" ? context.user.id : null,
        responseApprovedAt: input.intent === "approve-response" ? now : null,
      };
      const investigation = existing ? await tx.complaintInvestigation.update({ where: { id: existing.id }, data: common }) : await tx.complaintInvestigation.create({ data: { complaintId: id, ...common } });
      const retainedIds = issues.flatMap((issue) => issue.id ? [issue.id] : []);
      await tx.complaintIssue.deleteMany({ where: { complaintId: id, ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}) } });
      for (const [index, issue] of issues.entries()) {
        const issueData = { organisationId: context.organisation.id, locationId: complaint.locationId, complaintId: id, sequence: index + 1, category: issue.category, concern: issue.concern, finding: issue.finding as never, reasoning: nullable(issue.reasoning), outcomeSummary: nullable(issue.outcomeSummary), actionRequired: issue.actionRequired, evidenceLinks: { deleteMany: {}, create: issue.evidenceIds.map((evidenceId) => ({ evidenceId })) } };
        if (issue.id) await tx.complaintIssue.update({ where: { id: issue.id }, data: issueData }); else await tx.complaintIssue.create({ data: issueData });
      }
      await tx.registerEntry.update({ where: { id }, data: { status: "IN_REVIEW" } });
      const current = { investigationId: investigation.id, intent: input.intent, investigatorId, status: investigation.status, issues: issues.map((issue, index) => ({ ...issue, sequence: index + 1 })) };
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: input.intent === "approve-response" ? "RESPONSE_APPROVED" : input.intent === "complete" ? "INVESTIGATION_COMPLETED" : "INVESTIGATION_UPDATED", snapshot: { previous: { investigation: complaint.complaintInvestigation, issues: complaint.complaintIssues }, current } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: complaint.locationId, userId: context.user.id, action: "UPDATE", recordType: "ComplaintInvestigation", recordId: investigation.id, summary: `${input.intent === "approve-response" ? "Approved response" : input.intent === "complete" ? "Completed investigation" : "Updated investigation"} for ${complaint.reference}`, afterValue: current as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the Complaint investigation." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function parseIssues(form: FormData) {
  const count = Math.min(30, Math.max(0, Number(form.get("issueCount")) || 0));
  return Array.from({ length: count }, (_, index) => ({
    id: String(form.get(`issue_${index}_id`) ?? "") || null,
    category: String(form.get(`issue_${index}_category`) ?? "").trim(),
    concern: String(form.get(`issue_${index}_concern`) ?? "").trim(),
    finding: String(form.get(`issue_${index}_finding`) ?? "") || null,
    reasoning: String(form.get(`issue_${index}_reasoning`) ?? "").trim(),
    outcomeSummary: String(form.get(`issue_${index}_outcomeSummary`) ?? "").trim(),
    actionRequired: choice(form.get(`issue_${index}_actionRequired`)),
    evidenceIds: [...new Set(form.getAll(`issue_${index}_evidenceIds`).map(String).filter(Boolean))],
  })).filter((issue) => issue.category || issue.concern);
}

function validateCompletion(input: z.infer<typeof schema>, issues: ReturnType<typeof parseIssues>) {
  if (!input.immediateSafetyConcern || !input.triageSummary || !input.investigationOutcome) throw new Error("Complete the safety position, triage summary and investigation outcome.");
  if (!issues.length) throw new Error("Add at least one Complaint issue.");
  for (const issue of issues) {
    if (!issue.category || issue.concern.length < 3) throw new Error("Each Complaint issue needs a category and clear concern.");
    if (!issue.finding || !COMPLAINT_FINDINGS.includes(issue.finding as never) || issue.reasoning.length < 8) throw new Error("Record a finding and evidence-based rationale for every Complaint issue.");
  }
}

function nullable(value: string) { return value || null; }
function date(value: FormDataEntryValue | null) { const text = String(value ?? "").trim(); if (!text) return null; const parsed = new Date(`${text}T12:00:00.000Z`); if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid date."); return parsed; }
function choice(value: FormDataEntryValue | null) { const text = String(value ?? ""); return text === "true" ? true : text === "false" ? false : null; }
