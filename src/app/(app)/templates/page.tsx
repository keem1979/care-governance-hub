import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ensurePremiumTemplates } from "@/lib/premium-templates";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUSES,
  templateLabel,
  templateScopeWhere,
} from "@/lib/templates";

type Query = Record<string, string | string[] | undefined>;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const context = await requireAnyPermission([
    PERMISSIONS.GOVERNANCE_VIEW,
    PERMISSIONS.EVIDENCE_UPLOAD,
  ]);
  const query = await searchParams;
  const q = String(query.q ?? "").trim();
  const category = String(query.category ?? "");
  const status = String(query.status ?? "PUBLISHED");
  const source = String(query.source ?? "");
  const db = createDb();

  try {
    await ensurePremiumTemplates(db);
    const templates = await db.template.findMany({
      where: {
        AND: [
          templateScopeWhere(context.organisation.id),
          ...(q
            ? [
                {
                  OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    { description: { contains: q, mode: "insensitive" as const } },
                    { tags: { has: q } },
                  ],
                },
              ]
            : []),
        ],
        ...(category ? { category } : {}),
        ...(status ? { status: status as never } : {}),
        ...(source === "starter"
          ? { organisationId: null }
          : source === "organisation"
            ? { organisationId: context.organisation.id }
            : {}),
      },
      include: { author: { select: { name: true } } },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
    const canEdit = hasPermission(
      context.permissions,
      PERMISSIONS.GOVERNANCE_EDIT,
    );

    return (
      <main className="space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Reusable governance resources
            </p>
            <h1 className="text-3xl font-bold">Template Library</h1>
            <p className="mt-1 text-slate-600">
              Premium registered-manager documents with automatic organisation
              branding, evidence prompts, accountable actions and sign-off.
            </p>
          </div>
          {canEdit ? (
            <Link
              href="/templates/new"
              prefetch={false}
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white"
            >
              Add template
            </Link>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Available templates" value={templates.length} />
          <Stat label="RM-grade templates" value={templates.filter((item) => item.tags.includes("rm-grade")).length} />
          <Stat
            label="Starter templates"
            value={templates.filter((item) => !item.organisationId).length}
          />
          <Stat
            label="Organisation templates"
            value={templates.filter((item) => item.organisationId).length}
          />
        </section>

        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title, description or tag"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            aria-label="Template category"
            name="category"
            defaultValue={category}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {TEMPLATE_CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="Template status"
            name="status"
            defaultValue={status}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {TEMPLATE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {templateLabel(item)}
              </option>
            ))}
          </select>
          <select
            aria-label="Template source"
            name="source"
            defaultValue={source}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All sources</option>
            <option value="starter">Starter templates</option>
            <option value="organisation">Organisation templates</option>
          </select>
          <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
            Apply filters
          </button>
        </form>

        {templates.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((item) => (
              <Link
                href={`/templates/${item.id}`}
                key={item.id}
                prefetch={false}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    {item.category}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      item.status === "ARCHIVED"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {templateLabel(item.status)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold">{item.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {item.description}
                </p>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>
                    v{item.version} · {item.fileName}
                  </span>
                  <span>
                    {item.organisationId
                      ? (item.author?.name ?? "Organisation")
                      : "Starter template"}
                  </span>
                </div>
                {item.tags.includes("rm-grade") ? <p className="mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900">Premium RM grade</p> : null}
              </Link>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-bold">No templates found</h2>
            <p className="mt-1 text-sm text-slate-600">
              Try changing the filters, or add a template for your organisation.
            </p>
          </section>
        )}
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}
