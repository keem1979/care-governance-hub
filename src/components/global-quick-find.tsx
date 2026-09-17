"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Result = { id: string; kind: string; label: string; reference: string | null; meta: string; href: string };

const KIND_LABELS: Record<string, string> = {
  CLIENT: "Clients", STAFF: "Staff", INCIDENT: "Incidents", COMPLAINT: "Complaints",
  SAFEGUARDING: "Safeguarding", ACTION: "Actions", RISK: "Risks", EVIDENCE: "Evidence",
};

export function GlobalQuickFind() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const groups = useMemo(() => Object.entries(items.reduce<Record<string, Result[]>>((result, item) => {
    (result[item.kind] ??= []).push(item);
    return result;
  }, {})), [items]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const cleaned = query.trim();
    if (cleaned.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/quick-find?q=${encodeURIComponent(cleaned)}`, { signal: controller.signal });
        const result = await response.json();
        if (response.ok) setItems(result.items ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setItems([]);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setActive(0);
    if (value.trim().length < 2) {
      setItems([]);
      setLoading(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(items.length - 1, value + 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
    if (event.key === "Enter" && items[active]) {
      event.preventDefault();
      window.location.assign(items[active].href);
    }
  }

  let itemIndex = 0;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-500 hover:text-emerald-800" aria-label="Quick find clients, staff and governance records">
      <Search aria-hidden="true" size={17} /><span className="hidden md:inline">Quick find</span><kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 xl:inline">Ctrl K</kbd>
    </button>
    <dialog ref={dialogRef} onClose={close} onCancel={() => setOpen(false)} aria-labelledby="quick-find-title" className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-slate-950/45 sm:m-auto sm:h-auto sm:max-h-[82vh] sm:w-[min(46rem,calc(100vw-2rem))] sm:rounded-3xl">
      <section className="flex h-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[82vh] sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
          <Search aria-hidden="true" className="shrink-0 text-emerald-700" size={21} />
          <div className="min-w-0 flex-1"><h2 id="quick-find-title" className="sr-only">Quick find</h2><input ref={inputRef} value={query} onChange={(event) => changeQuery(event.target.value)} onKeyDown={onKeyDown} role="combobox" aria-label="Quick find authorised records" aria-expanded={items.length > 0} aria-controls="quick-find-results" aria-activedescendant={items[active] ? `quick-find-${items[active].kind}-${items[active].id}` : undefined} autoComplete="off" placeholder="Find a client, staff member or governance record" className="w-full bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-lg" /></div>
          <button type="button" onClick={close} className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50" aria-label="Close quick find"><X aria-hidden="true" size={20} /></button>
        </div>
        <div id="quick-find-results" className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" role="listbox" aria-label="Authorised search results">
          {query.trim().length < 2 ? <Hint title="Search across the records you are allowed to see" detail="Enter at least two characters. Results stay inside your organisation, location and permission scope." /> : loading ? <Hint title="Searching authorised records…" detail="QCGMS is checking the existing directories and governance registers." /> : groups.length ? <div className="space-y-5">{groups.map(([kind, results]) => <section key={kind} aria-labelledby={`quick-find-group-${kind}`}><h3 id={`quick-find-group-${kind}`} className="px-2 text-xs font-black uppercase tracking-[.14em] text-slate-500">{KIND_LABELS[kind] ?? kind}</h3><div className="mt-2 space-y-1">{results.map((result) => { const index = itemIndex++; return <Link id={`quick-find-${result.kind}-${result.id}`} key={`${result.kind}-${result.id}`} href={result.href} onClick={close} role="option" aria-selected={active === index} onMouseEnter={() => setActive(index)} className={`block rounded-xl border px-3 py-3 outline-none transition ${active === index ? "border-emerald-400 bg-emerald-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><span className="font-bold text-slate-950">{result.label}</span>{result.reference ? <span className="font-mono text-xs font-bold text-emerald-800">{result.reference}</span> : null}</div><p className="mt-1 text-xs leading-5 text-slate-600">{result.meta}</p></Link>; })}</div></section>)}</div> : <Hint title="No authorised record found" detail="Try a reference, name or shorter phrase. Quick Find never reveals records outside your access." />}
        </div>
        <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">↑↓ move · Enter open · Esc close</p>
      </section>
    </dialog>
  </>;
}

function Hint({ title, detail }: { title: string; detail: string }) {
  return <div className="grid min-h-56 place-items-center p-6 text-center"><div><p className="font-bold text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{detail}</p></div></div>;
}
