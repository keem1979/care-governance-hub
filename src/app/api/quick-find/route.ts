import { NextResponse } from "next/server";
import { actionScopeWhere } from "@/lib/actions";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { rankQuickFindItems, type QuickFindItem } from "@/lib/quick-find";
import { registerScopeWhere } from "@/lib/registers";
import { riskScopeWhere } from "@/lib/risks";
import { workforceScopeWhere } from "@/lib/workforce";

const REGISTER_KINDS = [
  { key: "incidents", kind: "INCIDENT", href: "incidents" },
  { key: "complaints", kind: "COMPLAINT", href: "complaints" },
  { key: "safeguarding", kind: "SAFEGUARDING", href: "safeguarding" },
] as const;

export async function GET(request: Request) {
  const context = await requireAuthorisedContext();
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return NextResponse.json({ items: [] });

  const governance = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW);
  const workforce = context.permissions.some((permission) => [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE].includes(permission as never));
  const actions = context.permissions.some((permission) => [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.ACTIONS_MANAGE, PERMISSIONS.ASSIGNED_TASKS_EDIT].includes(permission as never));
  const evidence = context.permissions.some((permission) => [PERMISSIONS.GOVERNANCE_VIEW, PERMISSIONS.EVIDENCE_UPLOAD, PERMISSIONS.ACTIONS_MANAGE].includes(permission as never));
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 4);
  const db = createDb();

  try {
    const [clients, staff, registerGroups, actionItems, risks, evidenceItems] = await Promise.all([
      governance ? db.client.findMany({
        where: { AND: [clientScopeWhere(context), ...terms.map((term) => ({ OR: [
          { clientReference: { contains: term, mode: "insensitive" as const } },
          { firstName: { contains: term, mode: "insensitive" as const } },
          { preferredName: { contains: term, mode: "insensitive" as const } },
          { lastName: { contains: term, mode: "insensitive" as const } },
        ] }))] },
        select: { id: true, clientReference: true, clientNumber: true, firstName: true, preferredName: true, lastName: true, status: true, location: { select: { name: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 12,
      }) : Promise.resolve([]),
      workforce ? db.staffMember.findMany({
        where: { AND: [workforceScopeWhere(context), ...terms.map((term) => ({ OR: [
          { employeeReference: { contains: term, mode: "insensitive" as const } },
          { firstName: { contains: term, mode: "insensitive" as const } },
          { preferredName: { contains: term, mode: "insensitive" as const } },
          { lastName: { contains: term, mode: "insensitive" as const } },
          { jobTitle: { contains: term, mode: "insensitive" as const } },
        ] }))] },
        select: { id: true, employeeReference: true, staffNumber: true, firstName: true, preferredName: true, lastName: true, jobTitle: true, employmentStatus: true, location: { select: { name: true } } },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 12,
      }) : Promise.resolve([]),
      governance ? Promise.all(REGISTER_KINDS.map((type) => db.registerEntry.findMany({
        where: { AND: [registerScopeWhere(context), { definition: { key: type.key }, archivedAt: null }, { OR: [
          { reference: { contains: query, mode: "insensitive" as const } },
          { title: { contains: query, mode: "insensitive" as const } },
          { summary: { contains: query, mode: "insensitive" as const } },
          { client: { OR: terms.flatMap((term) => [{ firstName: { contains: term, mode: "insensitive" as const } }, { lastName: { contains: term, mode: "insensitive" as const } }]) } },
        ] }] },
        select: { id: true, reference: true, title: true, status: true, riskLevel: true, client: { select: { firstName: true, preferredName: true, lastName: true } }, location: { select: { name: true } } },
        orderBy: { updatedAt: "desc" }, take: 12,
      }))) : Promise.resolve(REGISTER_KINDS.map(() => [])),
      actions ? db.action.findMany({
        where: { AND: [actionScopeWhere(context), { archivedAt: null }, { OR: [
          { reference: { contains: query, mode: "insensitive" as const } },
          { title: { contains: query, mode: "insensitive" as const } },
          { sourceReference: { contains: query, mode: "insensitive" as const } },
        ] }] },
        select: { id: true, reference: true, title: true, lifecycleStatus: true, priority: true, location: { select: { name: true } } },
        orderBy: { updatedAt: "desc" }, take: 12,
      }) : Promise.resolve([]),
      governance ? db.risk.findMany({
        where: { AND: [riskScopeWhere(context), { archivedAt: null }, { OR: [
          { reference: { contains: query, mode: "insensitive" as const } },
          { title: { contains: query, mode: "insensitive" as const } },
          { sourceReference: { contains: query, mode: "insensitive" as const } },
        ] }] },
        select: { id: true, reference: true, title: true, status: true, residualLevel: true, location: { select: { name: true } } },
        orderBy: { updatedAt: "desc" }, take: 12,
      }) : Promise.resolve([]),
      evidence ? db.evidence.findMany({
        where: { AND: [
          evidenceScopeWhere(context),
          ...(governance ? [] : [{ OR: [{ ownerId: context.user.id }, { uploadedById: context.user.id }] }]),
          { archivedAt: null, status: "ACTIVE" },
          { OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { sourceReference: { contains: query, mode: "insensitive" as const } },
          { sourceName: { contains: query, mode: "insensitive" as const } },
          { tags: { has: query.toLocaleLowerCase("en-GB") } },
          ] },
        ] },
        select: { id: true, title: true, category: true, evidenceType: true, sourceReference: true, currentnessStatus: true, location: { select: { name: true } } },
        orderBy: { updatedAt: "desc" }, take: 12,
      }) : Promise.resolve([]),
    ]);

    const items: QuickFindItem[] = [
      ...clients.map((item) => {
        const name = `${item.preferredName?.trim() || item.firstName} ${item.lastName}`;
        return { id: item.id, kind: "CLIENT" as const, label: name, reference: item.clientReference, meta: `Client ${item.clientNumber} · ${item.status.toLowerCase()} · ${item.location?.name ?? "Organisation-wide"}`, href: `/clients/${item.id}`, search: [name, item.clientReference, String(item.clientNumber)] };
      }),
      ...staff.map((item) => {
        const name = `${item.preferredName?.trim() || item.firstName} ${item.lastName}`;
        return { id: item.id, kind: "STAFF" as const, label: name, reference: item.employeeReference, meta: `${item.jobTitle} · ${item.employmentStatus.toLowerCase()} · ${item.location?.name ?? "Organisation-wide"}`, href: `/workforce/${item.id}`, search: [name, item.employeeReference, String(item.staffNumber), item.jobTitle] };
      }),
      ...registerGroups.flatMap((group, index) => group.map((item) => ({ id: item.id, kind: REGISTER_KINDS[index].kind, label: item.title, reference: item.reference, meta: [item.riskLevel.toLowerCase(), item.status.toLowerCase(), item.client ? `${item.client.preferredName?.trim() || item.client.firstName} ${item.client.lastName}` : null, item.location?.name ?? "Organisation-wide"].filter(Boolean).join(" · "), href: `/registers/${REGISTER_KINDS[index].href}/${item.id}`, search: [item.reference, item.title, item.client ? `${item.client.preferredName?.trim() || item.client.firstName} ${item.client.lastName}` : ""] }))),
      ...actionItems.map((item) => ({ id: item.id, kind: "ACTION" as const, label: item.title, reference: item.reference, meta: `${item.priority.toLowerCase()} · ${item.lifecycleStatus.toLowerCase().replaceAll("_", " ")} · ${item.location?.name ?? "Organisation-wide"}`, href: `/actions/${item.id}`, search: [item.reference, item.title] })),
      ...risks.map((item) => ({ id: item.id, kind: "RISK" as const, label: item.title, reference: item.reference, meta: `${item.residualLevel.toLowerCase()} · ${item.status.toLowerCase().replaceAll("_", " ")} · ${item.location?.name ?? "Organisation-wide"}`, href: `/risks/${item.id}`, search: [item.reference, item.title] })),
      ...evidenceItems.map((item) => ({ id: item.id, kind: "EVIDENCE" as const, label: item.title, reference: item.sourceReference, meta: `${item.category} · ${item.evidenceType} · ${(item.currentnessStatus ?? "unclassified").toLowerCase()} · ${item.location?.name ?? "Organisation-wide"}`, href: `/evidence/${item.id}`, search: [item.title, item.sourceReference ?? ""] })),
    ];

    const grouped = Object.values(items.reduce<Record<string, QuickFindItem[]>>((result, item) => {
      (result[item.kind] ??= []).push(item);
      return result;
    }, {})).flatMap((group) => rankQuickFindItems(query, group));
    return NextResponse.json({ items: grouped }, { headers: { "Cache-Control": "private, no-store" } });
  } finally {
    await db.$disconnect();
  }
}
