import { NextResponse } from "next/server";
import { SERVICE_READINESS_ITEMS } from "@/lib/launch-readiness";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST() {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), db = createDb();
  try {
    const existing = await db.serviceReadinessItem.count({ where: { organisationId: context.organisation.id } });
    if (existing) return NextResponse.json({ error: "The service-readiness register already exists." }, { status: 409 });
    await db.$transaction(async (tx) => {
      await tx.serviceReadinessItem.createMany({ data: SERVICE_READINESS_ITEMS.map((item) => ({ ...item, organisationId: context.organisation.id })) });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "CREATE", recordType: "ServiceReadinessRegister", summary: "Started the Phase 11 commercial service-readiness register", afterValue: { requiredItems: SERVICE_READINESS_ITEMS.length } } });
    });
    return NextResponse.json({ message: "Service-readiness register started." });
  } finally { await db.$disconnect(); }
}
