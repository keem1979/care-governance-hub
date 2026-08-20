import { NextResponse } from "next/server";
import { z } from "zod";
import { assertIndependentBenchmarkReview, benchmarkReviewSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = benchmarkReviewSchema.parse(await request.json()), consent = await db.benchmarkConsent.findFirst({ where: { organisationId: context.organisation.id, status: "REQUESTED" } });
    if (!consent) return NextResponse.json({ error: "No benchmark request is awaiting review." }, { status: 404 });
    assertIndependentBenchmarkReview(consent.requestedById, context.user.id);
    await db.$transaction([
      db.benchmarkConsent.update({ where: { id: consent.id }, data: { status: input.decision, reviewedById: context.user.id, reviewedAt: new Date(), reviewNote: input.reviewNote } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "APPROVAL", recordType: "BenchmarkConsent", recordId: consent.id, summary: `${input.decision === "APPROVED" ? "Approved" : "Declined"} privacy-preserving benchmark participation`, beforeValue: { status: "REQUESTED" }, afterValue: { status: input.decision, independentlyReviewed: true, aggregationOnly: true, directIdentifiersExcluded: true, freeTextExcluded: true } } }),
    ]);
    return NextResponse.json({ message: `Benchmark participation ${input.decision === "APPROVED" ? "approved" : "declined"}. No benchmark output is produced until the minimum cohort and privacy controls are independently satisfied.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "The benchmark review could not be recorded." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
