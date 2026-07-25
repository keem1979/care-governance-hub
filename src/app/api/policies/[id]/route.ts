import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate, POLICY_CATEGORIES, POLICY_STATUSES, splitList } from "@/lib/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "update");
  const db = createDb();
  try {
    const current = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id } });
    if (!current) return NextResponse.json({ error: "Policy not found." }, { status: 404 });

    if (intent === "archive" || intent === "restore") {
      const archive = intent === "archive";
      await db.$transaction([
        db.policy.update({ where: { id }, data: { status: archive ? "ARCHIVED" : "DRAFT", archivedAt: archive ? new Date() : null } }),
        db.activityLog.create({ data: {
          organisationId: context.organisation.id, userId: context.user.id,
          action: archive ? "ARCHIVE" : "RESTORE", recordType: "Policy", recordId: id,
          summary: `${archive ? "Archived" : "Restored"} policy: ${current.title}`,
        } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    if (intent === "approve") {
      await db.$transaction([
        db.policy.update({ where: { id }, data: {
          status: "APPROVED", approvalStatus: "APPROVED", approvedById: context.user.id,
          approvedAt: new Date(), lastReviewDate: new Date(),
        } }),
        db.activityLog.create({ data: {
          organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE",
          recordType: "Policy", recordId: id, summary: `Approved policy: ${current.title}`,
          afterValue: { status: "APPROVED" },
        } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const ownerId = String(form.get("ownerId") ?? "");
    const status = String(form.get("status") ?? "");
    if (title.length < 3 || title.length > 180) return NextResponse.json({ error: "Enter a valid title." }, { status: 400 });
    if (!POLICY_CATEGORIES.includes(category as never) || !POLICY_STATUSES.includes(status as never)) return NextResponse.json({ error: "Choose valid policy values." }, { status: 400 });
    const owner = await db.organisationMembership.findFirst({ where: { organisationId: context.organisation.id, userId: ownerId, status: "ACTIVE" } });
    if (!owner) return NextResponse.json({ error: "Choose an active policy owner." }, { status: 400 });
    await db.$transaction([
      db.policy.update({ where: { id }, data: {
        title, category, ownerId, status: status as typeof current.status,
        approvalStatus: status === "UNDER_REVIEW" ? "PENDING" : current.approvalStatus,
        effectiveDate: parseOptionalDate(form.get("effectiveDate")),
        nextReviewDate: parseOptionalDate(form.get("nextReviewDate")),
        tags: splitList(form.get("tags")), complianceAreas: splitList(form.get("complianceAreas")),
        notes: String(form.get("notes") ?? "").trim() || null,
      } }),
      db.activityLog.create({ data: {
        organisationId: context.organisation.id, userId: context.user.id, action: "UPDATE",
        recordType: "Policy", recordId: id, summary: `Updated policy: ${title}`,
        beforeValue: { title: current.title, status: current.status },
        afterValue: { title, status },
      } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update policy." }, { status: 400 });
  } finally {
    await db.$disconnect();
  }
}
