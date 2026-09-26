"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type SourceType = "INCIDENT" | "COMPLAINT" | "SAFEGUARDING" | "ACTION";
type Role = "SOURCE" | "COMPLETION" | "VERIFICATION" | "EFFECTIVENESS" | "CLOSURE";
type Result = { id: string; name: string; meta: string };

const roles: { value: Role; label: string }[] = [
  { value: "SOURCE", label: "Source" },
  { value: "COMPLETION", label: "Completion" },
  { value: "VERIFICATION", label: "Verification" },
  { value: "EFFECTIVENESS", label: "Effectiveness" },
  { value: "CLOSURE", label: "Closure" },
];

/** Adds one canonical Evidence record or relationship to an authorised source. */
export function ContextualEvidence({ sourceType, sourceId, role, linkedIds = [], label = "Add Evidence", allowUpload = true }: {
  sourceType: SourceType;
  sourceId: string;
  role?: Role;
  linkedIds?: string[];
  label?: string;
  allowUpload?: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "upload" | "existing" | "done">("choose");
  const [selectedRole, setSelectedRole] = useState<Role>(role ?? "SOURCE");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [preview, setPreview] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => trigger?.focus();
  }, [open]);

  function handleDialogKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function close() {
    setOpen(false);
    setMode("choose");
    setError("");
    setPreview(null);
  }

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/evidence/authorised-options?kind=EVIDENCE&q=${encodeURIComponent(query)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not search Evidence.");
      setResults(body.items ?? []);
      setPreview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not search Evidence.");
    } finally {
      setBusy(false);
    }
  }

  async function save(value: File | string) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("sourceType", sourceType);
      form.set("sourceId", sourceId);
      if (sourceType === "ACTION") form.set("role", selectedRole);
      if (typeof value === "string") form.set("evidenceId", value);
      else form.set("document", value);
      const response = await fetch("/api/evidence/contextual", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not add Evidence.");
      setAddedId(body.evidenceId);
      setMode("done");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add Evidence.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="my-3">
    <button ref={triggerRef} type="button" onClick={() => { setMode("choose"); setOpen(true); }} className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white">{label}</button>
    {open ? <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={handleDialogKey} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
      <div className="max-h-dvh w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="text-xl font-black">Add Evidence</h2>
          <button type="button" onClick={close} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-bold">Close</button>
        </div>
        {sourceType === "ACTION" && !role && mode !== "done" ? <label className="mt-4 block text-sm font-bold">What will this Evidence support?
          <select value={selectedRole} onChange={event => setSelectedRole(event.target.value as Role)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">
            {roles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label> : null}
        {mode === "choose" ? <div className="mt-5 grid gap-3">
          {allowUpload ? <button type="button" onClick={() => setMode("upload")} className="min-h-14 rounded-xl bg-emerald-800 px-4 text-left font-bold text-white">Upload file or photo</button> : null}
          <button type="button" onClick={() => { setMode("existing"); void search(); }} className="min-h-14 rounded-xl border border-emerald-700 px-4 text-left font-bold text-emerald-800">Use existing Evidence</button>
        </div> : null}
        {mode === "upload" ? <div className="mt-5 space-y-3">
          <p className="text-sm text-slate-600">Choose a file or take a photo. Evidence is added to this record automatically.</p>
          <label className="block text-sm font-bold">Choose file or photo
            <input type="file" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void save(file); }} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:font-bold file:text-white" />
          </label>
          <label className="block text-sm font-bold">Take a photo
            <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void save(file); }} className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-800 file:px-3 file:py-2 file:font-bold file:text-white" />
          </label>
          {busy ? <p role="status" className="text-sm font-bold text-emerald-800">Adding Evidence…</p> : null}
        </div> : null}
        {mode === "existing" ? <div className="mt-5">
          <form onSubmit={search} className="flex gap-2"><label className="min-w-0 flex-1 text-sm font-bold">Search Evidence
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Title or source" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
          </label><button disabled={busy} className="mt-5 min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white">Search</button></form>
          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto" aria-label="Search results">{results.map(item => <button key={item.id} type="button" onClick={() => setPreview(item)} className="w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-emerald-600"><strong>{item.name}</strong><span className="mt-1 block text-xs text-slate-600">{item.meta}</span></button>)}</div>
          {!busy && !results.length ? <p className="mt-3 text-sm text-slate-600">No authorised Evidence found.</p> : null}
          {preview ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-bold">Preview</h3><p className="mt-1 text-sm">{preview.name}</p><p className="mt-1 text-xs text-slate-600">{preview.meta}</p>{linkedIds.includes(preview.id) ? <p className="mt-3 text-sm font-bold text-emerald-800">Already linked to this record</p> : <button type="button" disabled={busy} onClick={() => void save(preview.id)} className="mt-3 min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white">{busy ? "Linking…" : "Link Evidence"}</button>}</div> : null}
        </div> : null}
        {mode === "done" ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status"><h3 className="font-bold text-emerald-900">Evidence added</h3><p className="mt-1 text-sm text-slate-700">It is linked to this record. Any review or assurance decision remains yours.</p><div className="mt-3 flex flex-wrap gap-3">{addedId ? <Link href={`/evidence/${addedId}/edit`} className="text-sm font-bold text-emerald-800 underline">Add a note or change details</Link> : null}<button type="button" onClick={close} className="text-sm font-bold text-emerald-800 underline">Done</button></div></div> : null}
        {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        {mode === "upload" || mode === "existing" ? <button type="button" onClick={() => { setMode("choose"); setError(""); }} className="mt-5 min-h-11 text-sm font-bold text-slate-700 underline">Back</button> : null}
      </div>
    </div> : null}
  </div>;
}
