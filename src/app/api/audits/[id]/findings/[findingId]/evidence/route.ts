import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { auditEligibleEvidenceWhere, auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const ROLES = ["SAMPLE", "RESPONSE", "FINDING", "SUPPORTING", "EFFECTIVENESS"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string; findingId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id, findingId } = await params, form = await request.formData(), db = createDb();
  try {
    const evidenceId = String(form.get("evidenceId") ?? ""), role = String(form.get("role") ?? "FINDING");
    if (!ROLES.includes(role)) throw new Error("Choose a valid evidence role.");
    const finding = await db.auditFinding.findFirst({ where: { id: findingId, auditId: id, audit: auditScopeWhere(context) }, select: { id: true, summary: true, audit: { select: { locationId: true, status: true } } } });
    if (!finding) return NextResponse.json({ error: "Audit Finding not found." }, { status: 404 });
    if (["CLOSED", "ARCHIVED"].includes(finding.audit.status)) return NextResponse.json({ error: "This audit is closed to changes." }, { status: 409 });
    const evidence = await db.evidence.findFirst({ where: { id: evidenceId, ...auditEligibleEvidenceWhere(context, finding.audit.locationId) }, select: { id: true, title: true, currentVersionId: true, taxonomyFamilyKey: true, taxonomyTypeKey: true, category: true, evidenceType: true } });
    if (!evidence) return NextResponse.json({ error: "Evidence is not available for this audit location." }, { status: 404 });
    const existing = await db.auditFindingEvidence.findFirst({ where: { auditFindingId: findingId, evidenceId, role: role as never, retiredAt: null }, select: { id: true } });
    if (!existing) await db.$transaction([
      db.auditFindingEvidence.create({ data: { auditFindingId: findingId, evidenceId, role: role as never, linkedById: context.user.id, evidenceSnapshot: { title: evidence.title, currentVersionId: evidence.currentVersionId, taxonomyFamilyKey: evidence.taxonomyFamilyKey, taxonomyTypeKey: evidence.taxonomyTypeKey, category: evidence.category, evidenceType: evidence.evidenceType } } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: finding.audit.locationId, userId: context.user.id, action: "UPDATE", recordType: "AuditFindingEvidence", recordId: findingId, summary: `Linked ${role.toLowerCase()} Evidence to Audit Finding: ${finding.summary}`, afterValue: { evidenceId, role } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not link Evidence." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
