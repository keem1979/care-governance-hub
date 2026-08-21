import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; findingId: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT), { id, findingId } = await params, form = await request.formData(), db = createDb();
  try {
    const finding = await db.auditFinding.findFirst({
      where: { id: findingId, auditId: id, audit: auditScopeWhere(context) },
      include: { action: { select: { closedAt: true } }, reaudits: { orderBy: { reviewDate: "desc" } }, evidenceLinks: { where: { retiredAt: null }, select: { id: true } }, audit: { select: { locationId: true } } },
    });
    if (!finding) return NextResponse.json({ error: "Audit Finding not found." }, { status: 404 });
    const intent = String(form.get("intent") ?? "update"), rationale = String(form.get("rationale") ?? "").trim();
    if (intent === "resolve") {
      if (rationale.length < 12) throw new Error("Record why the finding is ready for resolution.");
      if (finding.actionRequired && !finding.action?.closedAt) throw new Error("The canonical corrective Action must pass its own assurance closure before this finding can be resolved.");
      if (finding.evidenceLinks.length === 0) throw new Error("Link sufficient appropriate finding evidence before resolution.");
      if (["HIGH", "CRITICAL"].includes(finding.severity) && !finding.reaudits.some((review) => review.outcome === "RESOLVED")) throw new Error("High and Critical findings require a targeted re-audit outcome of Resolved.");
      const now = new Date();
      await db.$transaction([
        db.auditFinding.update({ where: { id: findingId }, data: { resolvedAt: now, resolvedById: context.user.id, resolutionRationale: rationale } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: finding.audit.locationId, userId: context.user.id, action: "APPROVAL", recordType: "AuditFinding", recordId: findingId, summary: `Resolved Audit Finding: ${finding.summary}`, afterValue: { resolvedAt: now, rationale, actionClosed: Boolean(finding.action?.closedAt), latestReaudit: finding.reaudits[0]?.outcome ?? null } } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    if (intent === "reopen") {
      if (!finding.resolvedAt) throw new Error("This finding is already open.");
      await db.$transaction([
        db.auditFinding.update({ where: { id: findingId }, data: { resolvedAt: null, resolvedById: null, resolutionRationale: null } }),
        db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: finding.audit.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "AuditFinding", recordId: findingId, summary: `Reopened Audit Finding: ${finding.summary}`, beforeValue: { resolvedAt: finding.resolvedAt }, afterValue: { resolvedAt: null } } }),
      ]);
      return NextResponse.json({ ok: true });
    }
    const severity = String(form.get("severity") ?? finding.severity), recommendation = String(form.get("recommendation") ?? "").trim(), immediateControl = String(form.get("immediateControl") ?? "").trim(), escalationRequired = form.get("escalationRequired") === "true", escalationRationale = String(form.get("escalationRationale") ?? "").trim();
    if (!SEVERITIES.includes(severity)) throw new Error("Choose a valid finding severity.");
    if (severity === "CRITICAL" && (!immediateControl || !escalationRequired || escalationRationale.length < 8)) throw new Error("A Critical finding requires an immediate safety control and a clear escalation route.");
    await db.$transaction([
      db.auditFinding.update({ where: { id: findingId }, data: { severity: severity as never, recommendation: recommendation || null, immediateControl: immediateControl || null, escalationRequired, escalationRationale: escalationRationale || null, actionRequired: form.get("actionRequired") !== "false" } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: finding.audit.locationId, userId: context.user.id, action: "UPDATE", recordType: "AuditFinding", recordId: findingId, summary: `Updated Audit Finding: ${finding.summary}`, beforeValue: { severity: finding.severity }, afterValue: { severity, escalationRequired } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update Audit Finding." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
