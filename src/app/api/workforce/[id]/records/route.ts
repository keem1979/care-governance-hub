import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import {
  STAFF_COMPLIANCE_OUTCOMES,
  STAFF_COMPLIANCE_TYPES,
  workforceScopeWhere,
} from "@/lib/workforce";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE);
  const { id } = await params;
  const form = await request.formData();
  const type = String(form.get("type") ?? "");
  const outcome = String(form.get("outcome") ?? "");
  const title = clean(form.get("title"), 160);
  const reference = optional(form.get("reference"), 120);
  const assessor = optional(form.get("assessor"), 120);
  const notes = optional(form.get("notes"), 2000);
  const completedDate = parseOptionalDate(form.get("completedDate"));
  const expiryDate = parseOptionalDate(form.get("expiryDate"));
  const nextDueDate = parseOptionalDate(form.get("nextDueDate"));

  if (
    title.length < 3 ||
    !STAFF_COMPLIANCE_TYPES.includes(type as never) ||
    !STAFF_COMPLIANCE_OUTCOMES.includes(outcome as never)
  ) {
    return NextResponse.json(
      { error: "Enter a title and choose valid compliance values." },
      { status: 400 },
    );
  }

  const db = createDb();
  try {
    const staff = await db.staffMember.findFirst({
      where: { id, ...workforceScopeWhere(context) },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff record not found." }, { status: 404 });
    }

    const dueDate = expiryDate ?? nextDueDate;
    const result = await db.$transaction(async (tx) => {
      const record = await tx.staffComplianceRecord.create({
        data: {
          organisationId: context.organisation.id,
          staffMemberId: id,
          type: type as never,
          title,
          reference,
          completedDate,
          expiryDate,
          nextDueDate,
          outcome: outcome as never,
          assessor,
          verifiedById: context.user.id,
          verifiedAt: new Date(),
          notes,
        },
      });
      if (dueDate) {
        await tx.calendarItem.create({
          data: {
            organisationId: context.organisation.id,
            locationId: staff.locationId,
            title: `${staff.employeeReference}: ${title}`,
            description: `Workforce ${type.toLowerCase().replaceAll("_", " ")} deadline.`,
            itemType: calendarType(type),
            dueDate,
            ownerId: context.user.id,
            riskLevel: ["DBS", "RIGHT_TO_WORK", "VISA", "PROFESSIONAL_REGISTRATION"].includes(type)
              ? "HIGH"
              : "MODERATE",
            createdById: context.user.id,
          },
        });
      }
      await tx.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          locationId: staff.locationId,
          userId: context.user.id,
          action: "CREATE",
          recordType: "StaffComplianceRecord",
          recordId: record.id,
          summary: `Recorded ${type.toLowerCase().replaceAll("_", " ")} for ${staff.employeeReference}`,
          afterValue: { staffMemberId: id, type, title, outcome, expiryDate, nextDueDate },
        },
      });
      return record;
    });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add the compliance record." },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}

function calendarType(type: string) {
  if (type === "TRAINING" || type === "COMPETENCY" || type === "INFORMATION_GOVERNANCE")
    return "TRAINING_EXPIRY" as const;
  if (type === "SUPERVISION") return "SUPERVISION_DEADLINE" as const;
  if (type === "APPRAISAL" || type === "SPOT_CHECK")
    return "APPRAISAL_DEADLINE" as const;
  return "CERTIFICATE_EXPIRY" as const;
}
function clean(value: FormDataEntryValue | null, limit: number) {
  return String(value ?? "").trim().slice(0, limit);
}
function optional(value: FormDataEntryValue | null, limit: number) {
  return clean(value, limit) || null;
}
