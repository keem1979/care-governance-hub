import Link from "next/link";
import { CalendarItemForm } from "@/components/calendar-item-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewCalendarItemPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const db = createDb();
  try {
    const memberships = await db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } });
    return <main className="mx-auto max-w-3xl space-y-5"><div><Link href="/calendar" className="text-sm font-semibold text-emerald-700">Back to Compliance Calendar</Link><h1 className="mt-2 text-3xl font-bold">Add compliance deadline</h1><p className="mt-1 text-slate-600">Record renewals and deadlines not already managed by another module.</p></div><CalendarItemForm members={memberships.map(({ user }) => user)} locations={context.locations.map(({ id, name }) => ({ id, name }))} /></main>;
  } finally {
    await db.$disconnect();
  }
}
