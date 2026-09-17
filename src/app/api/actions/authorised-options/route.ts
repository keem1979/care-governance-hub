import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/permissions";
import { workforceScopeWhere } from "@/lib/workforce";

const KINDS = ["OWNER", "OVERSIGHT", "CLIENT", "STAFF", "EVIDENCE"] as const;
type Kind = (typeof KINDS)[number];
const OVERSIGHT_ROLES = [ROLE_KEYS.REGISTERED_MANAGER, ROLE_KEYS.OWNER, ROLE_KEYS.NOMINATED_INDIVIDUAL, ROLE_KEYS.QUALITY_MANAGER];

export async function GET(request: Request) {
  const context = await requirePermission(PERMISSIONS.ACTIONS_MANAGE);
  const url = new URL(request.url);
  const kind = String(url.searchParams.get("kind") ?? "").toUpperCase() as Kind;
  const query = String(url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const locationId = String(url.searchParams.get("locationId") ?? "").trim();
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Choose a valid authorised record type." }, { status: 400 });
  if (locationId && !context.locations.some(({ id }) => id === locationId)) return NextResponse.json({ error: "Location is outside your authorised scope." }, { status: 403 });

  const db = createDb();
  try {
    if (kind === "OWNER" || kind === "OVERSIGHT") {
      const locationIds = locationId ? [locationId] : context.locations.map(({ id }) => id);
      const items = await db.organisationMembership.findMany({
        where: { AND: [
          { organisationId: context.organisation.id, status: "ACTIVE" },
          kind === "OVERSIGHT" ? { role: { key: { in: OVERSIGHT_ROLES } } } : {},
          !context.allLocations || locationId ? { OR: [{ allLocations: true }, { locations: { some: { locationId: { in: locationIds } } } }] } : {},
          query ? { OR: [
            { user: { name: { contains: query, mode: "insensitive" } } },
            { jobTitle: { contains: query, mode: "insensitive" } },
            { role: { name: { contains: query, mode: "insensitive" } } },
          ] } : {},
        ] },
        select: { user: { select: { id: true, name: true } }, role: { select: { name: true } }, jobTitle: true, allLocations: true, locations: { select: { location: { select: { name: true } } }, take: 2 } },
        orderBy: { user: { name: "asc" } },
        take: 20,
      });
      return NextResponse.json({ items: items.map((item) => ({ id: item.user.id, name: item.user.name, meta: [item.jobTitle || item.role.name, item.allLocations ? "All locations" : item.locations.map(({ location }) => location.name).join(", ")].filter(Boolean).join(" · ") })) });
    }

    if (kind === "CLIENT") {
      const items = await db.client.findMany({
        where: { AND: [clientScopeWhere(context), locationId ? { OR: [{ locationId: null }, { locationId }] } : {}, query ? { OR: [
          { clientReference: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { preferredName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ] } : {}] },
        select: { id: true, clientReference: true, firstName: true, preferredName: true, lastName: true, location: { select: { name: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 20,
      });
      return NextResponse.json({ items: items.map((item) => ({ id: item.id, name: `${item.clientReference} · ${item.preferredName?.trim() || item.firstName} ${item.lastName}`, meta: item.location?.name ?? "Organisation-wide" })) });
    }

    if (kind === "STAFF") {
      const items = await db.staffMember.findMany({
        where: { AND: [workforceScopeWhere(context), { employmentStatus: "ACTIVE" }, locationId ? { OR: [{ locationId: null }, { locationId }] } : {}, query ? { OR: [
          { employeeReference: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { preferredName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { jobTitle: { contains: query, mode: "insensitive" } },
        ] } : {}] },
        select: { id: true, employeeReference: true, firstName: true, preferredName: true, lastName: true, jobTitle: true, location: { select: { name: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 20,
      });
      return NextResponse.json({ items: items.map((item) => ({ id: item.id, name: `${item.employeeReference} · ${item.preferredName?.trim() || item.firstName} ${item.lastName}`, meta: [item.jobTitle, item.location?.name].filter(Boolean).join(" · ") })) });
    }

    const items = await db.evidence.findMany({
      where: { AND: [evidenceScopeWhere(context), { status: "ACTIVE", archivedAt: null }, locationId ? { OR: [{ locationId: null }, { locationId }] } : {}, query ? { OR: [
        { title: { contains: query, mode: "insensitive" } },
        { sourceName: { contains: query, mode: "insensitive" } },
        { sourceReference: { contains: query, mode: "insensitive" } },
      ] } : {}] },
      select: { id: true, title: true, category: true, evidenceType: true, location: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ items: items.map((item) => ({ id: item.id, name: item.title, meta: [item.category, item.evidenceType, item.location?.name ?? "Organisation-wide"].join(" · ") })) });
  } finally {
    await db.$disconnect();
  }
}
