"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string };
type ConnectionOption = Option & { status: string };
type GateValues = Record<string, boolean>;

const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";
const button = "rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

function useFormSubmit(url: string, method: "POST" | "PATCH" = "POST") {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch(url, { method, body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "The record could not be saved.");
      setBusy(false);
      return;
    }
    event.currentTarget.reset();
    setMessage(body.reference ? `${body.reference} staged successfully.` : "Saved successfully.");
    router.refresh();
    setBusy(false);
  }

  return { submit, busy, error, message };
}

export function ConnectionForm({ members, locations }: { members: Option[]; locations: Option[] }) {
  const state = useFormSubmit("/api/connected-governance/connections");
  return (
    <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Connection name"><input name="name" required maxLength={120} className={field} placeholder="Care record inbound events" /></Field>
      <Field label="Supplier / system"><input name="vendor" required maxLength={120} className={field} placeholder="Supplier name" /></Field>
      <Field label="Direction"><select name="direction" className={field}><option value="INBOUND">Inbound to QCGMS</option><option value="OUTBOUND">Outbound from QCGMS</option><option value="BIDIRECTIONAL">Bidirectional</option></select></Field>
      <Field label="Accountable owner"><select name="ownerId" required className={field}><option value="">Choose owner</option>{members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Scope"><select name="locationId" className={field}><option value="">Organisation-wide</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Approval review due"><input name="reviewDueAt" type="date" required className={field} /></Field>
      <Field label="Data classification"><input name="dataClassification" required maxLength={160} className={field} placeholder="Special category personal data" /></Field>
      <Field label="HTTPS endpoint (optional)"><input name="endpointUrl" type="url" pattern="https://.*" className={field} placeholder="https://supplier.example/api" /></Field>
      <Field label="Business purpose" wide><textarea name="purpose" required minLength={12} maxLength={2000} rows={3} className={field} placeholder="What the connection is permitted to do and why it is needed" /></Field>
      <Submit {...state} label="Create controlled review" />
    </form>
  );
}

const gates = [
  ["gateBusinessNeed", "Business need and scope"],
  ["gateDataProtection", "DPIA and data protection"],
  ["gateSupplierAssurance", "Supplier assurance"],
  ["gateSecurityDesign", "Security and secrets design"],
  ["gateTechnicalMapping", "Field mapping and source authority"],
  ["gateSafeTesting", "Safe test and rollback"],
  ["gateOperations", "Monitoring and failure response"],
  ["gateApproval", "Final accountable approval"],
] as const;

export function ConnectionReview({ id, status, values, reviewDueAt }: { id: string; status: string; values: GateValues; reviewDueAt: string }) {
  const state = useFormSubmit(`/api/connected-governance/connections/${id}`, "PATCH");
  return (
    <form onSubmit={state.submit} className="mt-4 border-t border-slate-200 pt-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {gates.map(([name, label]) => (
          <label key={name} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 text-xs font-bold">
            <input type="checkbox" name={name} value="true" defaultChecked={values[name]} className="mt-0.5 size-4 accent-emerald-700" />
            {label}
          </label>
        ))}
      </div>
      <label className="mt-3 block text-xs font-bold">Next assurance review<input name="reviewDueAt" type="date" defaultValue={reviewDueAt} className={field} /></label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button name="intent" value="save-review" disabled={state.busy} className={button}>Save gate review</button>
        {status !== "ACTIVE" && status !== "REVOKED" ? <button name="intent" value="activate" disabled={state.busy} className={button}>Activate after all gates</button> : null}
        {status === "ACTIVE" ? <button name="intent" value="pause" disabled={state.busy} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900">Pause connection</button> : null}
        {status !== "REVOKED" ? <button name="intent" value="revoke" disabled={state.busy} className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-black text-red-800">Revoke</button> : null}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function CredentialIssue({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [token, setToken] = useState("");
  async function issue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setToken("");
    const response = await fetch(`/api/connected-governance/connections/${connectionId}/credentials`, { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "The API token could not be issued.");
    else { setToken(body.token); event.currentTarget.reset(); router.refresh(); }
    setBusy(false);
  }
  return (
    <form onSubmit={issue} className="mt-3 rounded-xl bg-slate-950 p-3 text-white">
      <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Inbound API token</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2"><input name="name" required className={field} placeholder="Supplier production token" /><input name="expiresAt" type="date" className={field} /></div>
      <button disabled={busy} className="mt-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{busy ? "Issuing…" : "Issue token once"}</button>
      {error ? <p role="alert" className="mt-2 text-xs font-bold text-red-300">{error}</p> : null}
      {token ? <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-slate-950"><p className="text-xs font-black text-amber-900">Copy now — QCGMS will not display this token again.</p><code className="mt-2 block break-all text-xs">{token}</code></div> : null}
    </form>
  );
}

export function CredentialRevoke({ id }: { id: string }) {
  const state = useFormSubmit(`/api/connected-governance/credentials/${id}`, "PATCH");
  return <form onSubmit={state.submit}><button disabled={state.busy} className="text-xs font-black text-red-700 underline">{state.busy ? "Revoking…" : "Revoke"}</button>{state.error ? <span className="ml-2 text-xs text-red-700">{state.error}</span> : null}</form>;
}

export function ImportForm({ connections }: { connections: ConnectionOption[] }) {
  const state = useFormSubmit("/api/connected-governance/imports");
  return (
    <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Import target"><select name="target" className={field}><option value="CLIENT">Clients</option><option value="STAFF_MEMBER">Staff members</option></select></Field>
      <Field label="Approved connection (optional)"><select name="connectionId" className={field}><option value="">Manual controlled CSV</option>{connections.filter((item) => ["ACTIVE", "PAUSED"].includes(item.status)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Source system"><input name="sourceSystem" required className={field} placeholder="Legacy care system" /></Field>
      <Field label="CSV file"><input name="file" type="file" required accept=".csv,text/csv" className={field} /></Field>
      <div className="md:col-span-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-950"><strong>Required:</strong> external_id, first_name, last_name. Staff also needs job_title. Optional: email, phone, date_of_birth and location_code. The file is staged and analysed; it does not overwrite records.</div>
      <Submit {...state} label="Stage and analyse CSV" />
    </form>
  );
}

export function ApplyImport({ id }: { id: string }) {
  const state = useFormSubmit(`/api/connected-governance/imports/${id}/apply`);
  return <form onSubmit={state.submit} className="mt-3"><button disabled={state.busy} className={button}>{state.busy ? "Applying reviewed rows…" : "Apply safe rows"}</button><Feedback state={state} /></form>;
}

export function SourceAuthorityForm({ connections }: { connections: ConnectionOption[] }) {
  const state = useFormSubmit("/api/connected-governance/source-authorities");
  return (
    <form onSubmit={state.submit} className="grid gap-3 md:grid-cols-2">
      <Field label="Canonical record type"><select name="entityType" className={field}><option value="CLIENT">Client</option><option value="STAFF_MEMBER">Staff member</option><option value="SERVICE_LOCATION">Service location</option><option value="EXTERNAL_PARTY">External party</option></select></Field>
      <Field label="Authority level"><select name="authorityLevel" className={field}><option value="AUTHORITATIVE">Authoritative</option><option value="CONTRIBUTING">Contributing</option><option value="REFERENCE_ONLY">Reference only</option></select></Field>
      <Field label="Approved connection"><select name="connectionId" className={field}><option value="">Internal / manual source</option>{connections.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Named source system"><input name="sourceSystem" required className={field} placeholder="QCGMS Client Directory" /></Field>
      <Field label="Fields governed by this source" wide><textarea name="governedFields" required rows={2} className={field} placeholder="first name, last name, contact details" /></Field>
      <Field label="Decision rationale" wide><textarea name="rationale" required minLength={12} rows={3} className={field} placeholder="Why this is the trusted source and how conflicts are resolved" /></Field>
      <Field label="Review due"><input name="reviewDueAt" type="date" required className={field} /></Field>
      <Submit {...state} label="Approve source authority" />
    </form>
  );
}

export function OfflineReview({ id, conflict }: { id: string; conflict: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget), response = await fetch(`/api/connected-governance/offline-captures/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: form.get("intent"), reviewNote: form.get("reviewNote"), conflictReviewed: form.get("conflictReviewed") === "true" }) }), body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error ?? "The capture could not be reviewed."); else router.refresh();
    setBusy(false);
  }
  return (
    <form onSubmit={review} className="mt-3 grid gap-2">
      <textarea name="reviewNote" required minLength={12} rows={2} className={field} placeholder="Record the management review and reason" />
      {conflict ? <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-950"><input type="checkbox" name="conflictReviewed" value="true" className="mt-0.5" />I compared the offline note with the current source record.</label> : null}
      <div className="flex gap-2"><button name="intent" value="accept" disabled={busy} className={button}>Accept as unverified evidence</button><button name="intent" value="reject" disabled={busy} className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-black text-red-800">Reject</button></div>
      {error ? <p role="alert" className="text-xs font-bold text-red-700">{error}</p> : null}
    </form>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${wide ? "md:col-span-2 " : ""}text-sm font-semibold text-slate-800`}>{label}{children}</label>;
}

function Submit({ busy, error, message, label }: { busy: boolean; error: string; message: string; label: string }) {
  return <div className="md:col-span-2"><Feedback state={{ error, message }} /><button disabled={busy} className={button}>{busy ? "Saving…" : label}</button></div>;
}

function Feedback({ state }: { state: { error: string; message: string } }) {
  return <>{state.error ? <p role="alert" className="my-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700">{state.error}</p> : null}{state.message ? <p className="my-2 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-800">{state.message}</p> : null}</>;
}
