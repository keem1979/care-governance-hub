import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { inspectionScopeWhere } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const form = await request.formData();
  const jurisdiction = text(form, "jurisdiction", 80), regulator = text(form, "regulator", 120), name = text(form, "name", 180), versionLabel = text(form, "versionLabel", 120), sourceUrl = text(form, "sourceUrl", 1000), summary = text(form, "summary", 3000), changeSummary = text(form, "changeSummary", 3000), ownerId = text(form, "ownerId", 60), locationId = text(form, "locationId", 60) || null;
  const reviewDueAt = parseOptionalDate(form.get("reviewDueAt"));
  if ([jurisdiction, regulator, name, versionLabel].some((value) => value.length < 2) || summary.length < 10 || changeSummary.length < 10 || !reviewDueAt) return NextResponse.json({ error: "Complete the framework source, change summary, owner and review deadline." }, { status: 400 });
  if (!sourceUrl.startsWith("https://") || !URL.canParse(sourceUrl)) return NextResponse.json({ error: "Use the official HTTPS framework source URL." }, { status: 400 });
  if (locationId && !context.locations.some((item) => item.id === locationId)) return NextResponse.json({ error: "Choose an authorised location." }, { status: 400 });
  const db = createDb();
  try {
    const owner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE", ...(locationId ? { OR: [{ allLocations: true }, { locations: { some: { locationId } } }] } : {}) } });
    if (!owner) return NextResponse.json({ error: "Choose an active owner with access to the review location." }, { status: 400 });
    const affectedRequirementIds = unique(form.getAll("affectedRequirementIds")), affectedPolicyIds = unique(form.getAll("affectedPolicyIds")), affectedTemplateIds = unique(form.getAll("affectedTemplateIds"));
    const [requirements, policies, templates] = await Promise.all([
      db.complianceRequirement.count({ where: { ...inspectionScopeWhere(context), id: { in: affectedRequirementIds } } }),
      db.policy.count({ where: { organisationId: context.organisation.id, id: { in: affectedPolicyIds } } }),
      db.template.count({ where: { id: { in: affectedTemplateIds }, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] } }),
    ]);
    if (requirements !== affectedRequirementIds.length || policies !== affectedPolicyIds.length || templates !== affectedTemplateIds.length) return NextResponse.json({ error: "One or more affected records are outside your organisation." }, { status: 400 });
    const created = await db.$transaction(async (tx) => {
      const framework = await tx.regulatoryFrameworkVersion.upsert({ where: { organisationId_regulator_versionLabel: { organisationId: context.organisation.id, regulator, versionLabel } }, create: { organisationId: context.organisation.id, jurisdiction, regulator, name, versionLabel, sourceUrl, publishedAt: parseOptionalDate(form.get("publishedAt")), effectiveFrom: parseOptionalDate(form.get("effectiveFrom")), status: "CURRENT", summary, createdById: context.user.id }, update: { jurisdiction, name, sourceUrl, publishedAt: parseOptionalDate(form.get("publishedAt")), effectiveFrom: parseOptionalDate(form.get("effectiveFrom")), status: "CURRENT", summary } });
      const review = await tx.frameworkChangeReview.create({ data: { organisationId: context.organisation.id, locationId, frameworkVersionId: framework.id, changeSummary, affectedRequirementIds, affectedPolicyIds, affectedTemplateIds, ownerId, reviewDueAt } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId, userId: context.user.id, action: "CREATE", recordType: "FrameworkChangeReview", recordId: review.id, summary: `Created framework change review: ${regulator} ${versionLabel}`, afterValue: { frameworkVersionId: framework.id, affectedRequirementIds, affectedPolicyIds, affectedTemplateIds, sourceUrl } } });
      return review;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the framework review." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function text(form: FormData, key: string, max: number) { return String(form.get(key) ?? "").trim().slice(0, max); }
function unique(values: FormDataEntryValue[]) { return [...new Set(values.map(String).filter(Boolean))]; }
