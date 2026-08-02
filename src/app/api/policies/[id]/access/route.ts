import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  try {
    const policy = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id }, select: { id: true, title: true } });
    if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    await db.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "REPORT_GENERATION", recordType: "Policy", recordId: id, summary: `Opened the licensed print or PDF workflow: ${policy.title}`, afterValue: { licenceOrganisationId: context.organisation.id } } });
    return NextResponse.json({ ok: true });
  } finally { await db.$disconnect(); }
}
