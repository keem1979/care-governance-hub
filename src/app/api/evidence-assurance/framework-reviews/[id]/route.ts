import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const STATUSES = ["NEW", "UNDER_REVIEW", "ACTIONS_REQUIRED", "IMPLEMENTED", "NO_ACTION_REQUIRED"];
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const form = await request.formData();
  const status = String(form.get("status") ?? ""), impactAssessment = String(form.get("impactAssessment") ?? "").trim().slice(0, 4000), actionSummary = String(form.get("actionSummary") ?? "").trim().slice(0, 4000) || null;
  if (!STATUSES.includes(status) || (status !== "NEW" && impactAssessment.length < 10) || (status === "ACTIONS_REQUIRED" && !actionSummary)) return NextResponse.json({ error: "Record the impact assessment and any required actions before changing status." }, { status: 400 });
  const db = createDb();
  try {
    const review = await db.frameworkChangeReview.findFirst({ where: { id, organisationId: context.organisation.id, ...(context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: context.locations.map((item) => item.id) } }] }) }, include: { frameworkVersion: { select: { regulator: true, versionLabel: true } } } });
    if (!review) return NextResponse.json({ error: "Framework review not found." }, { status: 404 });
    const complete = ["IMPLEMENTED", "NO_ACTION_REQUIRED"].includes(status);
    await db.$transaction([
      db.frameworkChangeReview.update({ where: { id }, data: { status: status as never, impactAssessment, actionSummary, completedById: complete ? context.user.id : null, completedAt: complete ? new Date() : null } }),
      db.activityLog.create({ data: { organisationId: context.organisation.id, locationId: review.locationId, userId: context.user.id, action: "STATUS_CHANGE", recordType: "FrameworkChangeReview", recordId: id, summary: `Framework review ${review.frameworkVersion.regulator} ${review.frameworkVersion.versionLabel}: ${status.toLowerCase().replaceAll("_", " ")}`, afterValue: { status, complete } } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the framework review." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
