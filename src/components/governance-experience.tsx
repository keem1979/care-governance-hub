import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPin,
  ShieldAlert,
  UserRound,
} from "lucide-react";

export type WorklistTone = "critical" | "overdue" | "attention" | "assurance" | "routine" | "closed";

export type GovernanceWorklistItem = {
  id: string;
  href: string;
  reference: string;
  title: string;
  subject?: string | null;
  location: string;
  owner: string;
  stage: string;
  attention: string;
  supporting: string[];
  tone: WorklistTone;
  source?: { href: string; label: string } | null;
  ctaLabel?: string;
};

export function GovernanceWorklist({ items }: { items: GovernanceWorklistItem[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Governance worklist">
      <div className="divide-y divide-slate-200">
        {items.map((item) => (
          <article key={item.id} className="group relative px-4 py-4 transition hover:bg-slate-50 sm:px-5">
            <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${toneRail(item.tone)}`} aria-hidden="true" />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,.42fr)_auto] lg:items-center">
              <div className="min-w-0 pl-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-500">{item.reference}</span>
                  <span className={`rounded-full px-2 py-1 font-bold ${toneBadge(item.tone)}`}>{item.stage}</span>
                </div>
                <h2 className="mt-2 text-base font-bold text-slate-950 sm:text-lg">
                  <Link href={item.href} className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-emerald-600 focus-visible:after:ring-inset">
                    {item.title}
                  </Link>
                </h2>
                <p className={`mt-1 text-sm font-semibold ${toneText(item.tone)}`}>{item.attention}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  {item.subject ? <span className="inline-flex items-center gap-1.5"><UserRound aria-hidden="true" size={15} />{item.subject}</span> : null}
                  <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={15} />{item.location}</span>
                  {item.source ? <Link href={item.source.href} className="relative z-20 inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:underline">{item.source.label}<ArrowRight aria-hidden="true" size={14} /></Link> : null}
                </div>
              </div>
              <div className="pl-2 text-sm lg:pl-0">
                <p className="font-semibold text-slate-900">Owner: {item.owner}</p>
                {item.supporting.length ? (
                  <p className="mt-1 leading-6 text-slate-600">{item.supporting.join(" · ")}</p>
                ) : null}
              </div>
              <span className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 transition group-hover:border-emerald-500 group-hover:bg-emerald-50">
                {item.ctaLabel ?? "Open record"} <ArrowRight aria-hidden="true" size={16} />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QuickViewNav({
  items,
  active,
  defaultKey = "ALL",
}: {
  items: Array<{ key: string; label: string; count?: number }>;
  active: string;
  defaultKey?: string;
}) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Quick views">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.key === defaultKey ? "?" : `?view=${item.key}`}
          aria-current={active === item.key ? "page" : undefined}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-bold transition ${active === item.key ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-emerald-500"}`}
        >
          {item.label}{item.count === undefined ? "" : ` · ${item.count}`}
        </Link>
      ))}
    </nav>
  );
}

export function RecordHeader({
  backHref,
  backLabel,
  reference,
  title,
  statusLine,
  client,
  location,
  owner,
  stage,
  actions,
}: {
  backHref: string;
  backLabel: string;
  reference: string;
  title: string;
  statusLine: string;
  client?: string | null;
  location: string;
  owner: string;
  stage: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <Link href={backHref} className="text-sm font-bold text-emerald-800 hover:underline">← {backLabel}</Link>
      </div>
      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-emerald-800">{reference}</span>
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{stage}</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{statusLine}</p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {client ? <Meta icon={UserRound} label="Person" value={client} /> : null}
            <Meta icon={MapPin} label="Location" value={location} />
            <Meta icon={UserRound} label="Owner" value={owner} />
          </dl>
        </div>
        {actions ? <div className="relative flex flex-wrap gap-2 xl:max-w-md xl:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}

export function AttentionStrip({
  title,
  detail,
  tone = "attention",
  items = [],
}: {
  title: string;
  detail: string;
  tone?: "critical" | "attention" | "ready" | "closed";
  items?: string[];
}) {
  const Icon = tone === "ready" || tone === "closed" ? CheckCircle2 : tone === "critical" ? ShieldAlert : AlertTriangle;
  const colours = tone === "critical"
    ? "border-red-300 bg-red-50 text-red-950"
    : tone === "ready"
      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
      : tone === "closed"
        ? "border-slate-300 bg-slate-100 text-slate-900"
        : "border-amber-300 bg-amber-50 text-amber-950";
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${colours}`} aria-label="Record attention summary">
      <div className="flex gap-3">
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={21} />
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6">{detail}</p>
          {items.length ? <ul className="mt-2 space-y-1 text-sm">{items.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}</ul> : null}
        </div>
      </div>
    </section>
  );
}

export type GovernanceTimelineEntry = {
  id: string;
  title: string;
  detail?: string | null;
  actor?: string | null;
  occurredAt: Date;
  tone?: "default" | "decision" | "attention";
};

export function GovernanceTimeline({ entries }: { entries: GovernanceTimelineEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="timeline">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Clock3 aria-hidden="true" size={19} /></span>
        <div><p className="text-xs font-black uppercase tracking-[.14em] text-slate-500">Governed chronology</p><h2 className="text-xl font-black">Timeline</h2></div>
      </div>
      {sorted.length ? (
        <ol className="relative mt-5 space-y-0 before:absolute before:bottom-2 before:left-[.46rem] before:top-2 before:w-px before:bg-slate-200">
          {sorted.map((entry) => (
            <li key={entry.id} className="relative grid grid-cols-[1rem_1fr] gap-3 pb-5 last:pb-0">
              <CircleDot aria-hidden="true" size={16} className={`relative z-10 mt-1 bg-white ${entry.tone === "attention" ? "text-amber-700" : entry.tone === "decision" ? "text-emerald-700" : "text-slate-400"}`} />
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-bold text-slate-950">{entry.title}</p>
                  <time className="text-xs text-slate-500" dateTime={entry.occurredAt.toISOString()}>{formatDateTime(entry.occurredAt)}</time>
                </div>
                {entry.detail ? <p className="mt-1 text-sm leading-6 text-slate-600">{entry.detail}</p> : null}
                {entry.actor ? <p className="mt-1 text-xs font-semibold text-slate-500">Recorded by {entry.actor}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No governed events are recorded yet.</p>}
    </section>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="flex items-center gap-2"><Icon aria-hidden="true" size={16} className="text-slate-400" /><div><dt className="sr-only">{label}</dt><dd>{value}</dd></div></div>;
}

function toneRail(tone: WorklistTone) {
  if (tone === "critical") return "bg-red-600";
  if (tone === "overdue") return "bg-amber-600";
  if (tone === "attention") return "bg-orange-500";
  if (tone === "assurance") return "bg-violet-600";
  if (tone === "closed") return "bg-slate-300";
  return "bg-emerald-600";
}

function toneBadge(tone: WorklistTone) {
  if (tone === "critical") return "bg-red-100 text-red-800";
  if (tone === "overdue") return "bg-amber-100 text-amber-900";
  if (tone === "attention") return "bg-orange-100 text-orange-900";
  if (tone === "assurance") return "bg-violet-100 text-violet-900";
  if (tone === "closed") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-800";
}

function toneText(tone: WorklistTone) {
  if (tone === "critical") return "text-red-800";
  if (tone === "overdue") return "text-amber-900";
  if (tone === "attention") return "text-orange-900";
  if (tone === "assurance") return "text-violet-900";
  return "text-slate-600";
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
