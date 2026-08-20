import Link from "next/link";
import { AuditStartForm } from "@/components/audit-start-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewAuditPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const context = await requirePermission(PERMISSIONS.AUDITS_COMPLETE);
  const { template } = await searchParams;
  const db = createDb();
  try {
    const templates = await db.auditTemplate.findMany({
      where: { isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] },
      include: { sections: { select: { _count: { select: { questions: true } } } } },
      orderBy: { name: "asc" },
    });
    return <main className="mx-auto max-w-4xl space-y-5">
      <div><Link href="/audits" className="text-sm font-semibold text-emerald-700">Back to Audit Centre</Link><p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">Step 1 of 2 · Quick start</p><h1 className="mt-1 text-3xl font-bold">Start an audit</h1><p className="mt-1 text-slate-600">Choose the form, service and date. QCGMS prepares the remaining setup and opens the working audit.</p></div>
      <AuditStartForm
        templates={templates.map((item) => ({ id: item.id, key: item.key, name: item.name, version: item.version, description: item.description, category:item.category,standardRefs:item.standardRefs,frequency:item.frequency,serviceSpecific:item.serviceSpecific,questionCount: item.sections.reduce((sum, section) => sum + section._count.questions, 0) }))}
        locations={context.locations.map((item) => ({ id: item.id, name: item.name }))}
        selectedTemplate={template}
      />
    </main>;
  } finally { await db.$disconnect(); }
}
