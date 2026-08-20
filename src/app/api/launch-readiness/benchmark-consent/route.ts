import { NextResponse } from "next/server";
import { z } from "zod";
import { benchmarkRequestSchema } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const withdrawalSchema = z.object({ reason: z.string().trim().min(12).max(1000) });

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = benchmarkRequestSchema.parse(await request.json()), existing = await db.benchmarkConsent.findUnique({ where: { organisationId: context.organisation.id } });
    if (existing?.status === "APPROVED") return NextResponse.json({ error: "Approved benchmark consent cannot be silently replaced. Withdraw it before requesting a different scope." }, { status: 409 });
    const consent = await db.$transaction(async (tx) => {
      const saved = await tx.benchmarkConsent.upsert({ where: { organisationId: context.organisation.id }, create: { organisationId: context.organisation.id, status: "REQUESTED", permittedMetricKeys: input.permittedMetricKeys, minimumCohortSize: input.minimumCohortSize, dpiaReference: input.dpiaReference, requestedById: context.user.id, requestedAt: new Date() }, update: { status: "REQUESTED", permittedMetricKeys: input.permittedMetricKeys, minimumCohortSize: input.minimumCohortSize, dpiaReference: input.dpiaReference, aggregationOnly: true, directIdentifiersExcluded: true, freeTextExcluded: true, requestedById: context.user.id, requestedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "BenchmarkConsent", recordId: saved.id, summary: "Requested independently reviewed benchmark participation", afterValue: { status: "REQUESTED", permittedMetricKeys: input.permittedMetricKeys, minimumCohortSize: input.minimumCohortSize, aggregationOnly: true, directIdentifiersExcluded: true, freeTextExcluded: true } } });
      return saved;
    });
    return NextResponse.json({ id: consent.id, message: "Benchmark participation request saved for independent review." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Benchmark consent could not be requested." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

export async function PATCH(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const input = withdrawalSchema.parse(await request.json()), consent = await db.benchmarkConsent.findUnique({ where: { organisationId: context.organisation.id } });
    if (!consent || !["REQUESTED", "APPROVED"].includes(consent.status)) return NextResponse.json({ error: "There is no active benchmark participation to withdraw." }, { status: 404 });
    await db.$transaction([
      db.benchmarkConsent.update({ where: { id: consent.id }, data: { status: "WITHDRAWN", reviewedById: context.user.id, reviewedAt: new Date(), reviewNote: input.reason } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "BenchmarkConsent", recordId: consent.id, summary: "Withdrew benchmark participation", beforeValue: { status: consent.status }, afterValue: { status: "WITHDRAWN", reasonRecorded: true } } }),
    ]);
    return NextResponse.json({ message: "Benchmark participation withdrawn. Future aggregate processing is no longer authorised." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Benchmark participation could not be withdrawn." }, { status: 400 });
  } finally { await db.$disconnect(); }
}
