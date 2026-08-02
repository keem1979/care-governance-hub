"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateKpiReturnSummary, formatRate, KPI_RETURN_SECTIONS, type KpiReturnData } from "@/lib/kpi-suite";

type Location = { id: string; name: string; code: string };

export function MonthlyKpiReturnForm({
  locations,
  initial,
  defaults,
  currentUserCanSubmit,
}: {
  locations: Location[];
  defaults?: {
    reportingMonth: string;
    locationId: string;
    data: KpiReturnData;
    sourceCount: number;
  };
  initial?: {
    id: string;
    reportingMonth: string;
    locationId: string;
    localAuthority: string;
    contractName: string;
    providerCode: string;
    locationCode: string;
    ecmSystem: string;
    managerComment: string;
    status: string;
    data: KpiReturnData;
  };
  currentUserCanSubmit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<KpiReturnData>(initial?.data ?? defaults?.data ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const summary = useMemo(() => calculateKpiReturnSummary(values), [values]);
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";
  const locked = initial?.status === "LOCKED";

  async function save(formElement: HTMLFormElement, intent: "draft" | "review" | "submit") {
    setBusy(true);
    setError("");
    const form = new FormData(formElement);
    form.set("intent", intent);
    if (initial?.id) form.set("id", initial.id);
    const response = await fetch("/api/kpis/returns", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "The monthly return could not be saved.");
      setBusy(false);
      return;
    }
    router.push(`/kpis/returns/${result.id}`);
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget, "draft"); }}>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {!initial && defaults?.sourceCount ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Started from QCGMS records.</strong> {defaults.sourceCount} figures below were pre-filled from this branch’s visits, workforce, complaints and safeguarding records. Check each number before submission.</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">Return details</h2><p className="text-sm text-slate-600">One return is kept for each branch and reporting month.</p></div>
          {initial ? <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold">{initial.status.replaceAll("_", " ")}</span> : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium">Reporting month<input className={field} name="reportingMonth" type="month" required defaultValue={initial?.reportingMonth ?? defaults?.reportingMonth ?? new Date().toISOString().slice(0, 7)} /></label>
          <label className="text-sm font-medium">Branch<select className={field} name="locationId" required defaultValue={initial?.locationId ?? defaults?.locationId ?? locations[0]?.id}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label className="text-sm font-medium">Commissioner or contract owner<input className={field} name="localAuthority" required defaultValue={initial?.localAuthority} placeholder="Enter the organisation receiving this return" /></label>
          <label className="text-sm font-medium">Contract or framework<input className={field} name="contractName" defaultValue={initial?.contractName ?? "Care Within the Home"} /></label>
          <label className="text-sm font-medium">Provider identifier <span className="font-normal text-slate-500">(optional)</span><input className={field} name="providerCode" defaultValue={initial?.providerCode} placeholder="Your internal or regulatory identifier" /></label>
          <label className="text-sm font-medium">Service identifier <span className="font-normal text-slate-500">(optional)</span><input className={field} name="locationCode" defaultValue={initial?.locationCode} placeholder="Your internal service or branch identifier" /></label>
          <label className="text-sm font-medium md:col-span-2 xl:col-span-3">Electronic call monitoring system<input className={field} name="ecmSystem" defaultValue={initial?.ecmSystem} placeholder="Enter the system used during this month" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="text-lg font-bold text-blue-950">Rates calculated for you</h2>
        <p className="mt-1 text-sm text-blue-900">These results use the monthly totals entered below. Save the return to update the KPI scorecard.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Rate label="Calls delivered as planned" value={summary.successfulDeliveryRate} />
          <Rate label="Care-call exceptions" value={summary.providerExceptionRate} />
          <Rate label="Restart acceptance" value={summary.restartAcceptanceRate} />
          <Rate label="Referral response" value={summary.referralResponseRate} />
          <Rate label="New-starter rate" value={summary.staffJoinerRate} />
          <Rate label="Orientation completion" value={summary.orientationCompletionRate} />
          <Rate label="Care Certificate compliance" value={summary.careCertificateRate} />
          <Rate label="Live-in supervision" value={summary.liveInSupervisionRate} />
          <Rate label="Competency compliance" value={summary.competencyCompletionRate} />
          <Rate label="Complaint closure" value={summary.complaintClosureRate} />
        </div>
      </section>

      {KPI_RETURN_SECTIONS.map((section) => (
        <section key={section.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{section.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((item) => (
              <label key={item.key} className="text-sm font-medium">
                <span>{item.label}</span>
                <input
                  className={field}
                  min="0"
                  name={item.key}
                  type="number"
                  inputMode="numeric"
                  defaultValue={initial?.data[item.key] ?? defaults?.data[item.key] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value === "" ? 0 : Number(event.target.value) }))}
                />
                {item.help ? <span className="mt-1 block text-xs font-normal text-slate-500">{item.help}</span> : null}
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="text-sm font-medium">Registered Manager commentary<textarea className={`${field} min-h-28`} name="managerComment" defaultValue={initial?.managerComment} placeholder="Explain material changes, exceptions, risks and planned actions." /></label>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        This internal return brings service delivery, workforce, complaints and safeguarding figures into one consistent monthly record. Check any contract-specific definitions and deadlines before external submission.
      </div>

      {!locked ? <div className="flex flex-wrap gap-3">
        <button disabled={busy} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold" type="submit">{busy ? "Saving…" : "Save draft"}</button>
        <button disabled={busy} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white" type="button" onClick={(event) => { if (event.currentTarget.form) void save(event.currentTarget.form, "review"); }}>Mark ready for review</button>
        {currentUserCanSubmit ? <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white" type="button" onClick={(event) => { if (event.currentTarget.form) void save(event.currentTarget.form, "submit"); }}>Submit return</button> : null}
      </div> : <p className="rounded-xl bg-slate-100 p-4 text-sm font-semibold">This return is locked and cannot be changed.</p>}
    </form>
  );
}

function Rate({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl border border-blue-100 bg-white p-4"><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{formatRate(value)}</p><p className="mt-1 text-[11px] font-semibold text-blue-700">Calculated from the figures entered</p></div>;
}
