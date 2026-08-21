import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { ACTION_EVIDENCE_ROLES, linkActionEvidence, type ActionEvidenceRole } from "@/lib/action-assurance";
import { actionScopeWhere } from "@/lib/actions";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { evidenceTypesForContext, taxonomyLabels } from "@/lib/evidence-taxonomy";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, select: { id: true, locationId: true, category: true, sourceType: true, sourceRecordId: true, evidenceLinks: { where: { retiredAt: null }, select: { evidenceId: true } } } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const url = new URL(request.url), q = (url.searchParams.get("q") ?? "").trim().slice(0, 100), role = validRole(url.searchParams.get("role"));
    const expected = new Set(evidenceTypesForContext({ riskCategory: action.category, module: action.sourceType }).map((item) => `${item.familyKey}:${item.key}`));
    if (action.sourceType === "RISK" && action.sourceRecordId) {
      const applications = await db.riskControlApplication.findMany({ where: { riskId: action.sourceRecordId, organisationId: context.organisation.id, status: "APPLIED" }, select: { controlVersion: { select: { expectedEvidenceFamilyKeys: true, expectedEvidenceTypeKeys: true } } } });
      for (const application of applications) for (const family of application.controlVersion.expectedEvidenceFamilyKeys) for (const type of application.controlVersion.expectedEvidenceTypeKeys) expected.add(`${family}:${type}`);
    }
    const existing = new Set(action.evidenceLinks.map((item) => item.evidenceId));
    const candidates = await db.evidence.findMany({
      where: { AND: [evidenceScopeWhere(context), { status: "ACTIVE", archivedAt: null }, ...(q ? [{ OR: [{ title: { contains: q, mode: "insensitive" as const } }, { tags: { has: q.toLowerCase() } }] }] : [])] },
      select: { id: true, title: true, locationId: true, category: true, evidenceType: true, taxonomyFamilyKey: true, taxonomyTypeKey: true, currentnessStatus: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }, take: 60,
    });
    const results = candidates.map((item) => {
      const taxonomyKey = `${item.taxonomyFamilyKey}:${item.taxonomyTypeKey}`, contextual = expected.has(taxonomyKey), sameLocation = Boolean(action.locationId && item.locationId === action.locationId);
      const labels = item.taxonomyFamilyKey && item.taxonomyTypeKey ? taxonomyLabels(item.taxonomyFamilyKey, item.taxonomyTypeKey) : null;
      const score = (contextual ? 40 : 0) + (sameLocation ? 20 : 0) + (item.currentnessStatus === "CURRENT" ? 10 : 0) + (existing.has(item.id) ? 5 : 0);
      return { id: item.id, title: item.title, taxonomy: labels ? `${labels.familyLabel} · ${labels.typeLabel}` : `${item.category} · ${item.evidenceType}`, currentness: item.currentnessStatus, alreadyLinked: existing.has(item.id), suggestedRole: role, reason: contextual ? "Evidence type matches this Action context or an applied Provider Control." : sameLocation ? "Available in the same authorised location." : "Available within your authorised Evidence Library scope.", score };
    }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 20);
    return NextResponse.json({ results, method: "Deterministic ranking uses Action context, Provider Control expectations, authorised location and Evidence currentness. It does not decide suitability." });
  } finally { await db.$disconnect(); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const action = await db.action.findFirst({ where: { id, ...actionScopeWhere(context) }, select: { id: true, organisationId: true, locationId: true, reference: true, closedAt: true } });
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (action.closedAt) throw new Error("Closed Actions are read-only. Reopen the Action before linking new Evidence.");
    const role = validRole(String(form.get("role") ?? "")), evidenceIds = [...new Set(form.getAll("evidenceIds").map(String).filter(Boolean))];
    if (!evidenceIds.length) throw new Error("Choose at least one Evidence record.");
    const count = await db.evidence.count({ where: { id: { in: evidenceIds }, ...evidenceScopeWhere(context) } });
    if (count !== evidenceIds.length) throw new Error("One or more Evidence records are outside your authorised scope.");
    await db.$transaction(async (tx) => {
      await linkActionEvidence(tx, { actionId: id, organisationId: context.organisation.id, evidenceIds, role, actorId: context.user.id });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, locationId: action.locationId, userId: context.user.id, action: "CREATE", recordType: "ActionEvidence", recordId: id, summary: `Linked ${evidenceIds.length} ${role.toLowerCase()} Evidence record(s) to ${action.reference}`, afterValue: { evidenceIds, role, linkedById: context.user.id } } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not link Evidence." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE), { id } = await params, form = await request.formData(), db = createDb();
  try {
    const linkId = String(form.get("linkId") ?? ""), reason = String(form.get("reason") ?? "").trim();
    if (reason.length < 8) throw new Error("Explain why this Evidence relationship is being retired.");
    const link = await db.actionEvidence.findFirst({ where: { id: linkId, actionId: id, retiredAt: null, action: actionScopeWhere(context) }, include: { action: { select: { reference: true, locationId: true, closedAt: true } } } });
    if (!link) return NextResponse.json({ error: "Active Evidence relationship not found." }, { status: 404 });
    if (link.action.closedAt) throw new Error("Closed Actions are read-only. Reopen the Action before retiring an Evidence relationship.");
    const now = new Date();
    await db.$transaction([
      db.actionEvidence.update({ where: { id: link.id }, data: { retiredAt: now, retiredById: context.user.id, retirementReason: reason } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: link.action.locationId, userId: context.user.id, action: "ARCHIVE", recordType: "ActionEvidence", recordId: link.id, summary: `Retired ${link.role.toLowerCase()} Evidence relationship from ${link.action.reference}`, beforeValue: { actionId: id, evidenceId: link.evidenceId, role: link.role, linkedAt: link.linkedAt }, afterValue: { retiredAt: now, retiredById: context.user.id, reason } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not retire Evidence relationship." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}

function validRole(value: string | null): ActionEvidenceRole {
  if (!value || !ACTION_EVIDENCE_ROLES.includes(value as ActionEvidenceRole)) throw new Error("Choose a valid Action Evidence role.");
  return value as ActionEvidenceRole;
}
