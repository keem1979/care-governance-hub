import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { workforceScopeWhere } from "@/lib/workforce";

export async function GET(request: Request) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const [firstTerm, ...remainingTerms] = query.split(/\s+/);
  const lastTerm = remainingTerms.join(" ");
  const locationId = (url.searchParams.get("locationId") ?? "").trim();
  if (kind !== "CLIENT" && kind !== "STAFF") return NextResponse.json({ error: "Choose a valid directory." }, { status: 400 });
  if (locationId && !context.locations.some((item) => item.id === locationId)) return NextResponse.json({ error: "Location is outside your authorised scope." }, { status: 403 });
  const db = createDb();
  try {
    if (kind === "CLIENT") {
      const rows = await db.client.findMany({
        where: { AND: [clientScopeWhere(context), { status: { in: ["PROSPECT", "ACTIVE", "PAUSED"] } }, locationId ? { OR: [{ locationId: null }, { locationId }] } : {}, query ? { OR: [
          { clientReference: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { preferredName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          ...(lastTerm ? [{ AND: [{ OR: [
            { firstName: { contains: firstTerm, mode: "insensitive" as const } },
            { preferredName: { contains: firstTerm, mode: "insensitive" as const } },
          ] }, { lastName: { contains: lastTerm, mode: "insensitive" as const } }] }] : []),
        ] } : {}] },
        select: { id: true, clientReference: true, clientNumber: true, firstName: true, preferredName: true, lastName: true, location: { select: { name: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 20,
      });
      return NextResponse.json({ items: rows.map((item) => ({ id: item.id, name: `${item.preferredName?.trim() || item.firstName} ${item.lastName} · ${item.clientReference}`, meta: `Client ${item.clientNumber} · ${item.location?.name ?? "Organisation-wide"}` })) });
    }
    const rows = await db.staffMember.findMany({
      where: { AND: [workforceScopeWhere(context), { employmentStatus: { not: "LEFT" } }, locationId ? { OR: [{ locationId: null }, { locationId }] } : {}, query ? { OR: [
        { employeeReference: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { preferredName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        ...(lastTerm ? [{ AND: [{ OR: [
          { firstName: { contains: firstTerm, mode: "insensitive" as const } },
          { preferredName: { contains: firstTerm, mode: "insensitive" as const } },
        ] }, { lastName: { contains: lastTerm, mode: "insensitive" as const } }] }] : []),
      ] } : {}] },
      select: { id: true, staffNumber: true, employeeReference: true, firstName: true, preferredName: true, lastName: true, location: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 20,
    });
    return NextResponse.json({ items: rows.map((item) => ({ id: item.id, name: `${item.preferredName?.trim() || item.firstName} ${item.lastName} · ${item.employeeReference}`, meta: `Staff ${item.staffNumber} · ${item.location?.name ?? "Organisation-wide"}` })) });
  } finally { await db.$disconnect(); }
}
