import { NextResponse } from "next/server";
import { z } from "zod";
import { assistantDigest, assistantEscalationReference, redactAssistantText } from "@/lib/assistant-governance";
import { answerAssistant } from "@/lib/assistant-knowledge";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";

const schema = z.object({ query: z.string().trim().min(1).max(500), currentPath: z.string().max(500).optional() });

export async function POST(request: Request) {
  const context = await requireAuthorisedContext();
  const db = createDb();
  try {
    const input = schema.parse(await request.json()), currentPath = input.currentPath?.startsWith("/") ? input.currentPath : "", reply = answerAssistant(input.query, context.permissions, currentPath);
    const [queryHash, answerHash, assignedManager] = await Promise.all([
      assistantDigest(input.query),
      assistantDigest(reply.answer),
      findAssignedManager(db, context.organisation.id, context.membershipId, context.user.id),
    ]);
    const result = await db.$transaction(async (tx) => {
      const interaction = await tx.aIInteractionLog.create({ data: {
        organisationId: context.organisation.id,
        userId: context.user.id,
        queryHash,
        queryRedacted: redactAssistantText(input.query),
        currentPath: currentPath || null,
        responseClass: reply.responseClass,
        confidence: reply.confidence,
        topicName: reply.topicName,
        answerHash,
        answerText: reply.answer,
        escalationReason: reply.escalation?.message,
        sources: { create: reply.sources.map((source) => ({ ...source, checkedAt: source.checkedAt ? new Date(`${source.checkedAt}T00:00:00.000Z`) : null })) },
      } });
      let escalationReference: string | null = null;
      if (reply.escalation) {
        const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "ABI_ESCALATION" } }, create: { organisationId: context.organisation.id, key: "ABI_ESCALATION", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
        escalationReference = assistantEscalationReference(counter.currentValue);
        const escalation = await tx.assistantEscalation.create({ data: { organisationId: context.organisation.id, interactionId: interaction.id, reference: escalationReference, priority: reply.escalation.priority, reasonCode: reply.escalation.reasonCode, questionRedacted: redactAssistantText(input.query), raisedById: context.user.id, assignedToId: assignedManager } });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "AssistantEscalation", recordId: escalation.id, summary: `Abi created management escalation ${escalationReference}`, afterValue: { priority: reply.escalation.priority, reasonCode: reply.escalation.reasonCode, rawQuestionStored: false } } });
      }
      return { interactionId: interaction.id, escalationReference };
    });
    return NextResponse.json({ ...reply, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Enter a question up to 500 characters." : "Abi could not create the required safe audit record. No answer was issued." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  } finally {
    await db.$disconnect();
  }
}

async function findAssignedManager(db: ReturnType<typeof createDb>, organisationId: string, membershipId: string, userId: string) {
  const reportingLine = await db.organisationMembership.findFirst({ where: { id: membershipId, organisationId, reportsTo: { status: "ACTIVE" } }, select: { reportsTo: { select: { userId: true } } } });
  if (reportingLine?.reportsTo?.userId) return reportingLine.reportsTo.userId;
  const manager = await db.organisationMembership.findFirst({ where: { organisationId, status: "ACTIVE", userId: { not: userId }, role: { key: { in: ["registered-manager", "quality-compliance-manager", "organisation-owner"] } } }, select: { userId: true }, orderBy: { createdAt: "asc" } });
  return manager?.userId ?? null;
}
