import "server-only";
import type { AuthorisedContext } from "@/lib/auth/dal";
import { actionScopeWhere } from "@/lib/actions";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { registerScopeWhere } from "@/lib/registers";

export async function getInspectionFormOptions(context: AuthorisedContext) {
  const db = createDb();
  try {
    const [memberships, evidence, audits, registers, actions] = await Promise.all([
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 300 }),
      db.audit.findMany({ where: { ...auditScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { auditDate: "desc" }, take: 200 }),
      db.registerEntry.findMany({ where: { ...registerScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, reference: true, title: true }, orderBy: { eventDate: "desc" }, take: 300 }),
      db.action.findMany({ where: { ...actionScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, reference: true, title: true }, orderBy: { dueDate: "desc" }, take: 300 }),
    ]);
    return {
      members: memberships.map(({ user }) => user),
      locations: context.locations.map(({ id, name }) => ({ id, name })),
      evidence: evidence.map(({ id, title }) => ({ id, name: title })),
      audits: audits.map(({ id, title }) => ({ id, name: title })),
      registers: registers.map(({ id, reference, title }) => ({ id, name: `${reference} - ${title}` })),
      actions: actions.map(({ id, reference, title }) => ({ id, name: `${reference} - ${title}` })),
    };
  } finally { await db.$disconnect(); }
}
