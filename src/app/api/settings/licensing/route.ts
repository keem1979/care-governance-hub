import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { validateLicenceSeats } from "@/lib/settings";

export async function PATCH(request: Request) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const form = await request.formData();
  const licenceSeats = Number(form.get("licenceSeats"));
  const db = createDb();

  try {
    const [organisation, activeUsers] = await Promise.all([
      db.organisation.findUniqueOrThrow({
        where: { id: context.organisation.id },
        select: { licenceSeats: true },
      }),
      db.organisationMembership.count({
        where: {
          organisationId: context.organisation.id,
          status: "ACTIVE",
        },
      }),
    ]);
    validateLicenceSeats(licenceSeats, activeUsers);

    await db.$transaction([
      db.organisation.update({
        where: { id: context.organisation.id },
        data: { licenceSeats },
      }),
      db.activityLog.create({
        data: {
          organisationId: context.organisation.id,
          userId: context.user.id,
          action: "UPDATE",
          recordType: "OrganisationLicence",
          recordId: context.organisation.id,
          summary: `Changed user licences from ${organisation.licenceSeats} to ${licenceSeats}.`,
          beforeValue: { licenceSeats: organisation.licenceSeats },
          afterValue: { licenceSeats },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: `Licence quantity updated to ${licenceSeats}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update licence quantity.",
      },
      { status: 400 },
    );
  } finally {
    await db.$disconnect();
  }
}
