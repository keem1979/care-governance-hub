import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export type AuthorisedContext = {
  user: { id: string; name: string; email: string };
  sessionId: string;
  organisation: { id: string; name: string; slug: string; isDemo: boolean };
  membershipId: string;
  role: { key: string; name: string };
  permissions: string[];
  allLocations: boolean;
  locations: { id: string; name: string; code: string }[];
};

export const getAuthorisedContext = cache(
  async (): Promise<AuthorisedContext | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    const claims = await verifySessionToken(token, getServerEnv().SESSION_SECRET);
    if (!claims) return null;

    const session = await db.session.findFirst({
      where: {
        id: claims.sessionId,
        userId: claims.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { isActive: true },
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberships: {
              where: { status: "ACTIVE" },
              orderBy: { joinedAt: "asc" },
              take: 1,
              select: {
                id: true,
                allLocations: true,
                organisation: {
                  select: { id: true, name: true, slug: true, isDemo: true },
                },
                role: {
                  select: {
                    key: true,
                    name: true,
                    permissions: {
                      select: { permission: { select: { key: true } } },
                    },
                  },
                },
                locations: {
                  select: {
                    location: {
                      select: { id: true, name: true, code: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const membership = session?.user.memberships[0];
    if (!session || !membership) return null;

    const locations = membership.allLocations
      ? await db.serviceLocation.findMany({
          where: {
            organisationId: membership.organisation.id,
            isActive: true,
            archivedAt: null,
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : membership.locations.map(({ location }) => location);

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      sessionId: session.id,
      organisation: membership.organisation,
      membershipId: membership.id,
      role: { key: membership.role.key, name: membership.role.name },
      permissions: membership.role.permissions.map(
        ({ permission }) => permission.key,
      ),
      allLocations: membership.allLocations,
      locations,
    };
  },
);

export async function requireAuthorisedContext(): Promise<AuthorisedContext> {
  const context = await getAuthorisedContext();
  if (!context) redirect("/login");
  return context;
}

export async function requirePermission(
  permission: PermissionKey,
): Promise<AuthorisedContext> {
  const context = await requireAuthorisedContext();
  if (!hasPermission(context.permissions, permission)) {
    redirect("/forbidden");
  }
  return context;
}
