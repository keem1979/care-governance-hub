import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";
import { STAFF_STATUSES } from "@/lib/workforce";
import { formatPersonReference } from "@/lib/people-references";
import { syncTrainingMatrixEvidence } from "@/lib/workforce-evidence";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.WORKFORCE_MANAGE);
  const form = await request.formData();
  const firstName = clean(form.get("firstName"), 80);
  const lastName = clean(form.get("lastName"), 80);
  const preferredName = optional(form.get("preferredName"), 80);
  const workEmail = optional(form.get("workEmail"), 160);
  const workPhone = optional(form.get("workPhone"), 40);
  const jobTitle = clean(form.get("jobTitle"), 120);
  const department = optional(form.get("department"), 120);
  const employmentType = optional(form.get("employmentType"), 80);
  const lineManager = optional(form.get("lineManager"), 120);
  const notes = optional(form.get("notes"), 2000);
  const locationId = optional(form.get("locationId"), 40);
  const employmentStatus = clean(form.get("employmentStatus"), 30);
  const startDate = parseOptionalDate(form.get("startDate"));
  const contractedDaysPerWeek = number(form.get("contractedDaysPerWeek"), 5);
  const annualLeaveEntitlementDays = number(form.get("annualLeaveEntitlementDays"), 28);
  const annualLeaveCarryOverDays = number(form.get("annualLeaveCarryOverDays"), 0);

  if (
    firstName.length < 2 ||
    lastName.length < 2 ||
    jobTitle.length < 2
  ) {
    return NextResponse.json(
      { error: "Enter the staff member’s name and job title." },
      { status: 400 },
    );
  }
  if (!STAFF_STATUSES.includes(employmentStatus as never)) {
    return NextResponse.json(
      { error: "Choose a valid employment status." },
      { status: 400 },
    );
  }
  if (
    locationId &&
    !context.locations.some(({ id }) => id === locationId)
  ) {
    return NextResponse.json(
      { error: "Choose an authorised service location." },
      { status: 400 },
    );
  }

  const db = createDb();
  try {
    const staff = await db.$transaction(async (tx) => {
      const counter = await tx.referenceCounter.upsert({ where: { organisationId_key: { organisationId: context.organisation.id, key: "STAFF" } }, create: { organisationId: context.organisation.id, key: "STAFF", currentValue: 1 }, update: { currentValue: { increment: 1 } } });
      const employeeReference = formatPersonReference("STF", counter.currentValue);
      const created = await tx.staffMember.create({
        data: {
          organisationId: context.organisation.id,
          locationId,
          employeeReference,
          staffNumber: counter.currentValue,
          firstName,
          lastName,
          preferredName,
          workEmail,
          workPhone,
          jobTitle,
          department,
          employmentType,
          startDate,
          employmentStatus: employmentStatus as never,
          lineManager,
          contractedDaysPerWeek,
          annualLeaveEntitlementDays,
          annualLeaveCarryOverDays,
          notes,
        },
      });
      const coreCourses = await tx.trainingCourse.findMany({
        where: { organisationId: null, serviceSpecific: false, archivedAt: null },
        select: { id: true },
      });
      if (coreCourses.length) {
        await tx.staffTrainingRequirement.createMany({
          data: coreCourses.map((course) => ({ organisationId: context.organisation.id, staffMemberId: created.id, trainingCourseId: course.id })),
          skipDuplicates: true,
        });
      }
      await tx.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          locationId,
          userId: context.user.id,
          action: "CREATE",
          recordType: "StaffMember",
          recordId: created.id,
          summary: `Added workforce compliance record: ${employeeReference}`,
          afterValue: { employeeReference, jobTitle, employmentStatus },
        },
      });
      await syncTrainingMatrixEvidence(tx, { organisationId: context.organisation.id, actorId: context.user.id });
      return created;
    });
    return NextResponse.json({ id: staff.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes("Unique constraint")
            ? "That employee reference is already in use."
            : error instanceof Error
              ? error.message
              : "Could not add the staff record.",
      },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}

function clean(value: FormDataEntryValue | null, limit: number) {
  return String(value ?? "").trim().slice(0, limit);
}
function optional(value: FormDataEntryValue | null, limit: number) {
  return clean(value, limit) || null;
}
function number(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(String(value ?? ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
