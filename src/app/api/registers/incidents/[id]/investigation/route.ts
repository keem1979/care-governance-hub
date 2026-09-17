import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { registerScopeWhere } from "@/lib/registers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const db = createDb();
  try {
    const incident = await db.registerEntry.findFirst({
      where: { id, ...registerScopeWhere(context), definition: { key: "incidents" }, archivedAt: null },
      select: {
        id: true, reference: true, locationId: true, riskLevel: true, status: true,
        incidentInvestigation: { select: { status: true, factualChronology: true, informationSources: true, personRepresentativeInvolvement: true, immediateCauses: true, contributingFactors: true, systemCauses: true, rootCause: true, notificationDecisionSummary: true, learning: true, learningSharedWith: true, affectedRecordsReviewed: true, outcome: true, noFurtherActionRationale: true, investigatorId: true, completedById: true, completedAt: true } },
      },
    });
    if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    const intent = String(form.get("intent") ?? "draft");
    if (!["draft", "complete"].includes(intent)) throw new Error("Choose save draft or complete investigation.");
    if (incident.status === "CLOSED") throw new Error("Reopen the Incident through Management Assurance before changing its investigation.");
    const complete = intent === "complete";
    const data = {
      factualChronology: optional(form, "factualChronology", 8000),
      informationSources: optional(form, "informationSources", 4000),
      personRepresentativeInvolvement: optional(form, "personRepresentativeInvolvement", 4000),
      immediateCauses: lines(form, "immediateCauses"),
      contributingFactors: lines(form, "contributingFactors"),
      systemCauses: lines(form, "systemCauses"),
      rootCause: optional(form, "rootCause", 4000),
      notificationDecisionSummary: optional(form, "notificationDecisionSummary", 5000),
      learning: optional(form, "learning", 4000),
      learningSharedWith: optional(form, "learningSharedWith", 4000),
      affectedRecordsReviewed: optional(form, "affectedRecordsReviewed", 4000),
      outcome: optional(form, "outcome", 4000),
      noFurtherActionRationale: optional(form, "noFurtherActionRationale", 3000),
    };
    if (complete) {
      if (!data.factualChronology || !data.notificationDecisionSummary || !data.outcome) throw new Error("Complete the factual chronology, notification decision summary and investigation outcome.");
      if (["MEDIUM", "HIGH", "CRITICAL"].includes(incident.riskLevel) && (!data.learning || !data.learningSharedWith || !data.personRepresentativeInvolvement)) throw new Error("For this incident level, record learning, how it was shared and person or representative involvement.");
      if (["HIGH", "CRITICAL"].includes(incident.riskLevel) && (!data.rootCause || !data.affectedRecordsReviewed)) throw new Error("High and Critical investigations require a root-cause conclusion and review of affected governed records.");
    }
    const now = new Date();
    await db.$transaction(async (tx) => {
      const investigation = await tx.incidentInvestigation.upsert({
        where: { incidentId: id },
        create: { organisationId: context.organisation.id, locationId: incident.locationId, incidentId: id, status: complete ? "COMPLETED" : "DRAFT", ...data, investigatorId: context.user.id, completedById: complete ? context.user.id : null, completedAt: complete ? now : null },
        update: { locationId: incident.locationId, status: complete ? "COMPLETED" : "DRAFT", ...data, investigatorId: context.user.id, completedById: complete ? context.user.id : null, completedAt: complete ? now : null },
      });
      if (incident.status === "OPEN") await tx.registerEntry.update({ where: { id }, data: { status: "IN_REVIEW" } });
      const previous = incident.incidentInvestigation ? { ...incident.incidentInvestigation, completedAt: incident.incidentInvestigation.completedAt?.toISOString() ?? null } : null;
      const current = { ...data, status: investigation.status, investigatorId: context.user.id, completedById: complete ? context.user.id : null, completedAt: investigation.completedAt?.toISOString() ?? null };
      await tx.registerEntryHistory.create({ data: { entryId: id, userId: context.user.id, action: complete ? "INVESTIGATION_COMPLETED" : "INVESTIGATION_UPDATED", snapshot: { investigationId: investigation.id, previous, current } as Prisma.InputJsonValue } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: incident.locationId, userId: context.user.id, action: "UPDATE", recordType: "IncidentInvestigation", recordId: investigation.id, summary: `${complete ? "Completed" : "Updated"} investigation for ${incident.reference}`, afterValue: { incidentId: id, status: investigation.status, completedAt: investigation.completedAt } as Prisma.InputJsonValue } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the investigation." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function optional(form: FormData, key: string, max: number) { const value = String(form.get(key) ?? "").trim(); if (value.length > max) throw new Error(`${key} is too long.`); return value || null; }
function lines(form: FormData, key: string) { return String(form.get(key) ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean).slice(0, 30); }
