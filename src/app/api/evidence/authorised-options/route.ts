import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  const context = await requireAnyPermission([PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.GOVERNANCE_EDIT, PERMISSIONS.ACTIONS_MANAGE]);
  const url = new URL(request.url);
  const kind = String(url.searchParams.get("kind") ?? "").toUpperCase();
  const query = String(url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const locationId = String(url.searchParams.get("locationId") ?? "").trim();
  if (kind !== "EVIDENCE") return NextResponse.json({ error: "This search accepts governed Evidence only." }, { status: 400 });
  if (locationId && !context.locations.some(({ id }) => id === locationId)) return NextResponse.json({ error: "Location is outside your authorised scope." }, { status: 403 });

  const db = createDb();
  try {
    const items = await db.evidence.findMany({
      where: { AND: [
        evidenceScopeWhere(context),
        { status: "ACTIVE", archivedAt: null },
        locationId ? { OR: [{ locationId: null }, { locationId }] } : {},
        query ? { OR: [
          { title: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { evidenceType: { contains: query, mode: "insensitive" } },
          { sourceName: { contains: query, mode: "insensitive" } },
          { sourceReference: { contains: query, mode: "insensitive" } },
        ] } : {},
      ] },
      select: { id: true, title: true, category: true, evidenceType: true, sourceReference: true, location: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ items: items.map((item) => ({
      id: item.id,
      name: item.title,
      meta: [item.category, item.evidenceType, item.sourceReference, item.location?.name ?? "Organisation-wide"].filter(Boolean).join(" · "),
    })) });
  } finally {
    await db.$disconnect();
  }
}
