import "server-only";

import type { AuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";

export type RecentDashboardActivity = {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  userName: string | null;
};

export async function getRecentDashboardActivity(
  context: AuthorisedContext,
): Promise<RecentDashboardActivity[]> {
  const db = createDb();
  const permittedLocationIds = context.locations.map(({ id }) => id);

  try {
    const activity = await db.activityLog.findMany({
      where: {
        organisationId: context.organisation.id,
        ...(context.allLocations
          ? {}
          : {
              OR: [
                { locationId: null },
                { locationId: { in: permittedLocationIds } },
              ],
            }),
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        summary: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    return activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
      userName: entry.user?.name ?? null,
    }));
  } finally {
    await db.$disconnect();
  }
}
