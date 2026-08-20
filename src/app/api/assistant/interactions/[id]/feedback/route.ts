import { NextResponse } from "next/server";
import { z } from "zod";
import { assistantEscalationReference, redactAssistantText } from "@/lib/assistant-governance";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";

const schema = z.object({ rating: z.enum(["HELPFUL", "NOT_HELPFUL", "UNSAFE"]), comment: z.string().trim().max(1000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireAuthorisedContext(), { id } = await params, db = createDb();
  try {
    const input = schema.parse(await request.json()), interaction = await db.aIInteractionLog.findFirst({ where: { id, organisationId: context.organisation.id, userId: context.user.id }, select: { id: true, responseClass: true, queryRedacted: true, escalation: { select: { id: true, reference: true } } } });
    if (!interaction) return NextResponse.json({ error: "Abi interaction not found." }, { status: 404 });
    const commentRedacted = input.comment ? redactAssistantText(input.comment, 1000) : null;
    const manager = input.rating === "UNSAFE" && !interaction.escalation ? await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, status: "ACTIVE", userId: { not: context.user.id }, role: { key: { in: ["registered-manager", "quality-compliance-manager", "organisation-owner"] } } }, select: { userId: true }, orderBy: { createdAt: "asc" } }) : null;
    const feedback = await db.$transaction(async (tx) => {
      const item = await tx.assistantFeedback.upsert({ where: { interactionId: id }, create: { organisationId: context.organisation.id, interactionId: id, userId: context.user.id, rating: input.rating, commentRedacted }, update: { rating: input.rating, commentRedacted } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE", recordType: "AssistantFeedback", recordId: item.id, summary: `Recorded ${input.rating.toLowerCase().replaceAll("_", " ")} feedback for Abi`, afterValue: { interactionId: id, responseClass: interaction.responseClass, rating: input.rating, rawCommentStored: false } } });
      let escalationReference = interaction.escalation?.reference ?? null;
      if (input.rating === "UNSAFE" && !interaction.escalation) {
        const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "ABI_ESCALATION" } }, create: { organisationId: context.organisation.id, key: "ABI_ESCALATION", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
        escalationReference = assistantEscalationReference(counter.currentValue);
        const escalation = await tx.assistantEscalation.create({ data: { organisationId: context.organisation.id, interactionId: id, reference: escalationReference, priority: "HIGH", reasonCode: "USER_FLAGGED_UNSAFE", questionRedacted: interaction.queryRedacted, raisedById: context.user.id, assignedToId: manager?.userId ?? null } });
        await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "AssistantEscalation", recordId: escalation.id, summary: `Created ${escalationReference} from unsafe Abi feedback`, afterValue: { priority: "HIGH", reasonCode: "USER_FLAGGED_UNSAFE", rawQuestionStored: false } } });
      }
      return { item, escalationReference };
    });
    return NextResponse.json({ id: feedback.item.id, rating: feedback.item.rating, escalationReference: feedback.escalationReference }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : "Feedback could not be recorded." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
