import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { EVIDENCE_VERIFICATION_OUTCOMES } from "@/lib/evidence-assurance";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const outcome = String(form.get("outcome") ?? "");
  const relevance = text(form, "relevance", 2000);
  const currencyAssessment = text(form, "currencyAssessment", 2000);
  const authenticityCheck = text(form, "authenticityCheck", 2000);
  const limitations = text(form, "limitations", 2000) || null;
  if (!EVIDENCE_VERIFICATION_OUTCOMES.includes(outcome as never)) return NextResponse.json({ error: "Choose a valid verification outcome." }, { status: 400 });
  if ([relevance, currencyAssessment, authenticityCheck].some((value) => value.length < 10)) return NextResponse.json({ error: "Record relevance, currency and authenticity checks before deciding the outcome." }, { status: 400 });
  if (outcome === "VERIFIED_WITH_LIMITATIONS" && !limitations) return NextResponse.json({ error: "Record the limitations attached to this evidence." }, { status: 400 });
  const db = createDb();
  try {
    const evidence = await db.evidence.findFirst({ where: { id, ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true, locationId: true, currentVersionId: true } });
    if (!evidence) return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
    const verifiedAt = new Date();
    const verification = await db.$transaction(async (tx) => {
      const created = await tx.evidenceVerification.create({ data: { organisationId: context.organisation.id, locationId: evidence.locationId, evidenceId: id, evidenceVersionId: evidence.currentVersionId, outcome: outcome as never, relevance, currencyAssessment, authenticityCheck, limitations, reviewDueAt: parseOptionalDate(form.get("reviewDueAt")), verifiedById: context.user.id, verifiedAt } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: evidence.locationId, userId: context.user.id, action: "APPROVAL", recordType: "EvidenceVerification", recordId: created.id, summary: `Evidence verification for ${evidence.title}: ${outcome.toLowerCase().replaceAll("_", " ")}`, afterValue: { evidenceId: id, evidenceVersionId: evidence.currentVersionId, outcome, reviewDueAt: created.reviewDueAt } } });
      return created;
    });
    return NextResponse.json({ id: verification.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify evidence." }, { status: 400 });
  } finally { await db.$disconnect(); }
}

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? "").trim().slice(0, max); }
