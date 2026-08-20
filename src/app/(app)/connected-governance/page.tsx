import Link from "next/link";
import { AlertTriangle, ArrowRight, CloudCog, DatabaseZap, LockKeyhole, PlugZap, ShieldCheck } from "lucide-react";
import { ApplyImport, ConnectionForm, ConnectionReview, CredentialIssue, CredentialRevoke, ImportForm, OfflineReview, SourceAuthorityForm } from "@/components/connected-governance-forms";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const gateNames = ["gateBusinessNeed", "gateDataProtection", "gateSupplierAssurance", "gateSecurityDesign", "gateTechnicalMapping", "gateSafeTesting", "gateOperations", "gateApproval"] as const;

export default async function ConnectedGovernancePage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const db = createDb();
  const locationIds = context.locations.map((item) => item.id);
  const scope = context.allLocations ? {} : { OR: [{ locationId: null }, { locationId: { in: locationIds } }] };
  const now = new Date();
  try {
    const [connections, batches, authorities, captures, events, members, openCases] = await Promise.all([
      db.integrationConnection.findMany({
        where: { organisationId: context.organisation.id, archivedAt: null, ...scope },
        include: {
          owner: { select: { name: true } },
          location: { select: { name: true } },
          credentials: { select: { id: true, name: true, tokenPrefix: true, expiresAt: true, lastUsedAt: true, revokedAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
          _count: { select: { events: true, importBatches: true } },
        },
        orderBy: [{ status: "asc" }, { reviewDueAt: "asc" }, { createdAt: "desc" }],
        take: 60,
      }),
      db.importBatch.findMany({
        where: { organisationId: context.organisation.id, ...scope },
        include: { createdBy: { select: { name: true } }, rows: { select: { id: true, rowNumber: true, firstName: true, lastName: true, externalId: true, status: true, validationMessages: true }, orderBy: { rowNumber: "asc" }, take: 8 } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.sourceAuthority.findMany({ where: { organisationId: context.organisation.id }, include: { connection: { select: { name: true } }, approvedBy: { select: { name: true } } }, orderBy: { entityType: "asc" } }),
      db.offlineCapture.findMany({ where: { organisationId: context.organisation.id, status: { in: ["PENDING_REVIEW", "CONFLICT"] }, ...scope }, include: { submittedBy: { select: { name: true } }, location: { select: { name: true } } }, orderBy: [{ status: "asc" }, { receivedAt: "asc" }], take: 50 }),
      db.integrationEvent.findMany({ where: { organisationId: context.organisation.id, status: { in: ["FAILED", "QUARANTINED"] }, ...scope }, include: { connection: { select: { name: true } }, reconciliationCase: { select: { id: true, reference: true } } }, orderBy: { receivedAt: "desc" }, take: 50 }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.reconciliationCase.count({ where: { organisationId: context.organisation.id, status: { in: ["OPEN", "UNDER_REVIEW", "MERGE_ESCALATED"] }, ...scope } }),
    ]);

    const canManageConnections = hasPermission(context.permissions, PERMISSIONS.ORGANISATION_MANAGE);
    const canImport = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT) || hasPermission(context.permissions, PERMISSIONS.WORKFORCE_MANAGE);
    const canReview = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const connectionOptions = connections.map((item) => ({ id: item.id, name: item.name, status: item.status }));
    const failedConnections = connections.filter((item) => item.health === "FAILED" || item.health === "DEGRADED" || item.status === "ERROR").length;
    const importConflicts = batches.reduce((sum, item) => sum + item.conflictRows + item.invalidRows, 0);
    const sourceReviews = authorities.filter((item) => item.reviewDueAt <= new Date(now.getTime() + 30 * 86_400_000)).length;

    return (
      <main className="space-y-7">
        <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-950 to-emerald-900 p-7 text-white shadow-lg">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">Phase 8 · connected governance</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black">Controlled connections without silent data changes</h1>
          <p className="mt-3 max-w-4xl text-emerald-50">Approve every connection, stage every import, quarantine ambiguous identities and review offline observations before they become evidence. QCGMS never silently overwrites a canonical care or workforce record.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/data-quality" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Identity reconciliation</Link><Link href="/offline-capture" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Open encrypted offline capture</Link><Link href="/activity?recordType=IntegrationConnection" className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Connection audit trail</Link></div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat icon={PlugZap} label="Approved connections" value={connections.filter((item) => item.status === "ACTIVE").length} />
          <Stat icon={CloudCog} label="Degraded / failed" value={failedConnections} warn />
          <Stat icon={DatabaseZap} label="Import exceptions" value={importConflicts} warn />
          <Stat icon={LockKeyhole} label="Offline review queue" value={captures.length} warn />
          <Stat icon={AlertTriangle} label="Open identity cases" value={openCases} warn />
          <Stat icon={ShieldCheck} label="Source reviews due" value={sourceReviews} warn />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Principle title="Stage before change" text="Imports and inbound events are analysed first. Exact identifiers link without changing a record; potential matches go to human reconciliation." />
          <Principle title="One named authority" text="Each canonical entity type has an explicit source, governed fields, accountable approval and review date." />
          <Principle title="Visible failure" text="Connection health, failed events, quarantined identities and review backlogs remain visible until resolved." />
        </section>

        {canManageConnections ? <section className="grid gap-5 xl:grid-cols-2"><Panel title="Propose a connection" intro="A proposal begins in review-required state. No token is issued and no connection is active until all eight assurance gates pass."><ConnectionForm members={members.map(({ user }) => user)} locations={context.locations} /></Panel><Panel title="Approve a source of truth" intro="Define which system is authoritative, contributing or reference-only. External sources must already be approved and active."><SourceAuthorityForm connections={connectionOptions} /></Panel></section> : null}

        <section className="space-y-3">
          <Heading title="Connection assurance register" count={connections.length} />
          <div className="grid gap-4 xl:grid-cols-2">
            {connections.length ? connections.map((item) => {
              const completedGates = gateNames.filter((gate) => item[gate]).length;
              const activeCredentials = item.credentials.filter((credential) => !credential.revokedAt && (!credential.expiresAt || credential.expiresAt > now));
              return <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.health === "FAILED" ? "border-red-300" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-teal-700">{item.vendor} · {label(item.direction)}</p><h3 className="mt-1 text-xl font-black">{item.name}</h3></div><div className="flex gap-2"><Badge value={item.status} /><Badge value={item.health} warn={["FAILED", "DEGRADED"].includes(item.health)} /></div></div>
                <p className="mt-3 text-sm text-slate-700">{item.purpose}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><Meta label="Owner" value={item.owner.name} /><Meta label="Scope" value={item.location?.name ?? "Organisation-wide"} /><Meta label="Approval gates" value={`${completedGates} of 8 complete`} /><Meta label="Review due" value={date(item.reviewDueAt)} /><Meta label="Events received" value={String(item._count.events)} /><Meta label="Staged imports" value={String(item._count.importBatches)} /></dl>
                {item.lastFailureAt ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-800"><strong>Last failure:</strong> {dateTime(item.lastFailureAt)} · {item.consecutiveFailures} consecutive</p> : null}
                {activeCredentials.length ? <div className="mt-3 rounded-xl border p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Active credentials</p>{activeCredentials.map((credential) => <div key={credential.id} className="mt-2 flex items-center justify-between gap-3 text-xs"><span><strong>{credential.name}</strong> · {credential.tokenPrefix}… · last used {dateTime(credential.lastUsedAt)}</span>{canManageConnections ? <CredentialRevoke id={credential.id} /> : null}</div>)}</div> : null}
                {canManageConnections ? <><ConnectionReview id={item.id} status={item.status} values={Object.fromEntries(gateNames.map((gate) => [gate, item[gate]]))} reviewDueAt={item.reviewDueAt.toISOString().slice(0, 10)} />{item.status === "ACTIVE" && ["INBOUND", "BIDIRECTIONAL"].includes(item.direction) ? <CredentialIssue connectionId={item.id} /> : null}</> : null}
              </article>;
            }) : <Empty text="No integration connection has been proposed. Create the assurance record before exchanging data." />}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3"><Heading title="Staged imports" count={batches.length} />{canImport ? <span className="text-xs font-bold text-slate-500">Maximum 500 rows · CSV only · no automatic ambiguous merges</span> : null}</div>
          {canImport ? <Panel title="Stage a controlled CSV import" intro="The analyser separates safe new records, exact external-ID links, potential duplicates and invalid rows before any authorised apply."><ImportForm connections={connectionOptions} /></Panel> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            {batches.length ? batches.map((batch) => <article key={batch.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{batch.reference} · {label(batch.target)}</p><h3 className="mt-1 text-lg font-black">{batch.originalFileName}</h3><p className="text-xs text-slate-500">{batch.sourceSystem} · staged by {batch.createdBy.name} · {dateTime(batch.createdAt)}</p></div><Badge value={batch.status} warn={["FAILED", "AWAITING_RECONCILIATION", "PARTIALLY_APPLIED"].includes(batch.status)} /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"><Metric label="Total" value={batch.totalRows} /><Metric label="Ready" value={batch.readyRows} good /><Metric label="Exact links" value={batch.matchedRows} /><Metric label="Conflicts" value={batch.conflictRows} warn /><Metric label="Invalid" value={batch.invalidRows} warn /></div>
              <div className="mt-4 space-y-2">{batch.rows.map((row) => <div key={row.id} className="grid gap-1 rounded-xl border border-slate-200 p-3 text-xs sm:grid-cols-[3rem_1fr_auto]"><strong>#{row.rowNumber}</strong><span><strong>{row.firstName} {row.lastName}</strong><br /><span className="text-slate-500">External ID {row.externalId}</span>{row.validationMessages.length ? <span className="mt-1 block text-amber-800">{row.validationMessages.join(" ")}</span> : null}</span><Badge value={row.status} warn={["POTENTIAL_MATCH", "INVALID"].includes(row.status)} /></div>)}</div>
              {batch.totalRows > batch.rows.length ? <p className="mt-2 text-xs text-slate-500">Showing the first {batch.rows.length} of {batch.totalRows} analysed rows.</p> : null}
              {canImport && ["READY_TO_APPLY", "AWAITING_RECONCILIATION", "PARTIALLY_APPLIED", "ANALYSED"].includes(batch.status) && batch.readyRows + batch.matchedRows > batch.appliedRows ? <ApplyImport id={batch.id} /> : null}
              {batch.conflictRows ? <Link href="/data-quality" className="mt-3 inline-flex items-center gap-1 text-sm font-black text-emerald-800">Resolve identity cases <ArrowRight size={15} /></Link> : null}
            </article>) : <Empty text="No imports have been staged." />}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="space-y-3"><Heading title="Source-of-truth register" count={authorities.length} /><div className="grid gap-3">{authorities.length ? authorities.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.reviewDueAt <= now ? "border-red-300" : ""}`}><div className="flex justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{label(item.entityType)}</p><h3 className="text-lg font-black">{item.sourceSystem}</h3></div><Badge value={item.authorityLevel} /></div><p className="mt-2 text-sm text-slate-700">{item.rationale}</p><p className="mt-3 text-xs text-slate-500"><strong>Governed fields:</strong> {item.governedFields.join(", ")}<br /><strong>Approved by:</strong> {item.approvedBy.name} · review {date(item.reviewDueAt)}{item.connection ? ` · ${item.connection.name}` : ""}</p></article>) : <Empty text="No source authority has been approved. Connected data should remain reference-only until this register is complete." />}</div></div>
          <div className="space-y-3"><Heading title="Failed and quarantined events" count={events.length} /><div className="grid gap-3">{events.length ? events.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.status === "FAILED" ? "border-red-300" : "border-amber-300"}`}><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{item.connection.name} · {label(item.operation)}</p><h3 className="font-black">Event {item.externalEventId}</h3></div><Badge value={item.status} warn /></div><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Meta label="Entity" value={item.entityType ? label(item.entityType) : "Not declared"} /><Meta label="External ID" value={item.externalId ?? "Not supplied"} /><Meta label="Received" value={dateTime(item.receivedAt)} /><Meta label="Checksum" value={`${item.payloadChecksum.slice(0, 14)}…`} /></dl>{item.failureMessage ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-800">{item.failureMessage}</p> : null}{item.reconciliationCase ? <Link href="/data-quality" className="mt-3 inline-block text-sm font-black text-emerald-800">{item.reconciliationCase.reference} · reconcile identity →</Link> : null}</article>) : <Empty text="No failed or quarantined integration events are waiting." />}</div></div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3"><Heading title="Offline capture review" count={captures.length} /><Link href="/offline-capture" className="text-sm font-black text-emerald-800">Open device capture tool →</Link></div>
          <div className="grid gap-4 xl:grid-cols-2">{captures.length ? captures.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.status === "CONFLICT" ? "border-amber-400" : ""}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{label(item.captureType)} · {item.location?.name ?? "Organisation-wide"}</p><h3 className="mt-1 text-lg font-black">{item.title}</h3></div><Badge value={item.status} warn={item.status === "CONFLICT"} /></div><p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.note}</p><p className="mt-3 text-xs text-slate-500">Captured {dateTime(item.capturedAt)} · synced by {item.submittedBy.name} · received {dateTime(item.receivedAt)}</p>{item.conflictReason ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-bold text-amber-950">{item.conflictReason}</p> : null}{canReview ? <OfflineReview id={item.id} conflict={item.status === "CONFLICT"} /> : null}</article>) : <Empty text="No synchronised offline captures are waiting for management review." />}</div>
        </section>
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}

function Stat({ icon: Icon, label: text, value, warn = false }: { icon: typeof PlugZap; label: string; value: number; warn?: boolean }) { return <div className={`rounded-2xl border p-5 shadow-sm ${warn && value ? "border-red-200 bg-red-50" : "bg-white"}`}><Icon size={20} className={warn && value ? "text-red-700" : "text-emerald-700"} /><p className="mt-2 text-sm text-slate-600">{text}</p><p className="text-3xl font-black">{value}</p></div>; }
function Principle({ title, text }: { title: string; text: string }) { return <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="text-emerald-700" size={20} /><h2 className="mt-2 font-black">{title}</h2><p className="mt-1 text-sm text-emerald-950">{text}</p></article>; }
function Panel({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) { return <details className="rounded-2xl border bg-white p-5 shadow-sm"><summary className="cursor-pointer text-xl font-black">{title}</summary><p className="mb-4 mt-2 text-sm text-slate-600">{intro}</p>{children}</details>; }
function Heading({ title, count }: { title: string; count: number }) { return <div><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-slate-500">{count} controlled record{count === 1 ? "" : "s"}</p></div>; }
function Badge({ value, warn = false }: { value: string; warn?: boolean }) { return <span className={`h-fit rounded-full px-2.5 py-1 text-[11px] font-black ${warn ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{label(value)}</span>; }
function Meta({ label: text, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-black uppercase tracking-wide text-slate-500">{text}</dt><dd className="mt-0.5 font-semibold text-slate-800">{value}</dd></div>; }
function Metric({ label: text, value, warn = false, good = false }: { label: string; value: number; warn?: boolean; good?: boolean }) { return <div className={`rounded-xl p-2 text-center ${warn && value ? "bg-red-50 text-red-800" : good && value ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}><p className="text-[10px] font-black uppercase">{text}</p><p className="text-xl font-black">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-slate-500">{text}</div>; }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase()); }
function date(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(value) : "Not set"; }
function dateTime(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Never"; }
