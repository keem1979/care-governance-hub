"use client";

import { useEffect, useId, useMemo, useState } from "react";

export type AsyncAuthorisedOption = { id: string; name: string; meta?: string };
type Kind = "OWNER" | "OVERSIGHT" | "CLIENT" | "STAFF" | "EVIDENCE";

function useAuthorisedOptions(kind: Kind, query: string, locationId: string, open: boolean, initial: AsyncAuthorisedOption[], endpoint: string) {
  const [items, setItems] = useState(initial), [loading, setLoading] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ kind, q: query.trim() });
        if (locationId) params.set("locationId", locationId);
        const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Could not search authorised records.");
        setItems(body.items ?? []);
      } catch (value) {
        if (!controller.signal.aborted) setError(value instanceof Error ? value.message : "Could not search authorised records.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [endpoint, kind, locationId, open, query]);
  return { items, loading, error };
}

export function AuthorisedAsyncCombobox({ name, label, kind, initialOptions, defaultValue = "", locationId = "", placeholder, required = false, emptyLabel = "No authorised match", endpoint = "/api/actions/authorised-options" }: { name: string; label: string; kind: Exclude<Kind, "EVIDENCE">; initialOptions: AsyncAuthorisedOption[]; defaultValue?: string; locationId?: string; placeholder: string; required?: boolean; emptyLabel?: string; endpoint?: string }) {
  const id = useId(), initial = initialOptions.find((option) => option.id === defaultValue);
  const [selected, setSelected] = useState(initial?.id ?? ""), [selectedOption, setSelectedOption] = useState<AsyncAuthorisedOption | null>(initial ?? null), [query, setQuery] = useState(initial?.name ?? ""), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const { items, loading, error } = useAuthorisedOptions(kind, selectedOption && query === selectedOption.name ? "" : query, locationId, open, initialOptions, endpoint);
  function choose(option: AsyncAuthorisedOption) { setSelected(option.id); setSelectedOption(option); setQuery(option.name); setOpen(false); setActive(0); }
  function change(value: string) { setQuery(value); setOpen(true); setActive(0); if (selectedOption?.name !== value) { setSelected(""); setSelectedOption(null); } }
  function clear() { setSelected(""); setSelectedOption(null); setQuery(""); setOpen(true); }
  return <div className="relative">
    <label htmlFor={id} className="text-sm font-semibold text-slate-800">{label}</label>
    <input type="hidden" name={name} value={selected} />
    <div className="relative mt-1"><input id={id} value={query} onChange={(event) => change(event.target.value)} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 140)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => Math.min(value + 1, Math.max(0, items.length - 1))); } else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); } else if (event.key === "Enter" && open && items[active]) { event.preventDefault(); choose(items[active]); } else if (event.key === "Escape") setOpen(false); }} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && items[active] ? `${id}-${items[active].id}` : undefined} aria-required={required} aria-invalid={required && !selected} autoComplete="off" placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-16 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />{query ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clear} className="absolute inset-y-0 right-2 px-2 text-xs font-bold text-slate-500" aria-label={`Clear ${label}`}>Clear</button> : null}</div>
    {open ? <div id={`${id}-options`} role="listbox" className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{loading ? <p role="status" className="p-3 text-sm text-slate-500">Searching authorised records…</p> : error ? <p role="alert" className="p-3 text-sm font-semibold text-red-700">{error}</p> : items.length ? items.map((option, index) => <button key={option.id} id={`${id}-${option.id}`} type="button" role="option" aria-selected={selected === option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className={`block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${index === active ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50"}`}><span className="block font-semibold">{option.name}</span>{option.meta ? <span className="block text-xs text-slate-500">{option.meta}</span> : null}</button>) : <p className="p-3 text-sm text-slate-500">{emptyLabel}</p>}</div> : null}
    <p className={`mt-1 text-xs ${required && !selected ? "text-amber-700" : "text-slate-500"}`}>{required && !selected ? "Choose a result from the authorised directory." : selectedOption?.meta ?? "Results are limited to records within your authorised scope."}</p>
  </div>;
}

export function AuthorisedAsyncMultiSelect({ name, label, kind, initialOptions, defaultValues = [], locationId = "", placeholder, endpoint = "/api/actions/authorised-options" }: { name: string; label: string; kind: Extract<Kind, "EVIDENCE">; initialOptions: AsyncAuthorisedOption[]; defaultValues?: string[]; locationId?: string; placeholder: string; endpoint?: string }) {
  const id = useId(), [query, setQuery] = useState(""), [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Map(initialOptions.filter((option) => defaultValues.includes(option.id)).map((option) => [option.id, option])));
  const { items, loading, error } = useAuthorisedOptions(kind, query, locationId, open, initialOptions, endpoint);
  const visible = useMemo(() => { const merged = new Map(selected); for (const item of items) merged.set(item.id, item); return [...merged.values()]; }, [items, selected]);
  function toggle(option: AsyncAuthorisedOption) { setSelected((current) => { const next = new Map(current); if (next.has(option.id)) next.delete(option.id); else next.set(option.id, option); return next; }); }
  return <div>{[...selected.keys()].map((value) => <input key={value} type="hidden" name={name} value={value} />)}<label htmlFor={id} className="text-sm font-semibold text-slate-800">{label}</label><input id={id} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder={placeholder} autoComplete="off" aria-controls={`${id}-options`} />{selected.size ? <p className="mt-2 text-xs font-bold text-emerald-800">{selected.size} existing Evidence record{selected.size === 1 ? "" : "s"} selected</p> : null}<div id={`${id}-options`} className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{loading ? <p role="status" className="p-3 text-sm text-slate-500">Searching the authorised Evidence Library…</p> : error ? <p role="alert" className="p-3 text-sm font-semibold text-red-700">{error}</p> : visible.length ? visible.map((option) => <label key={option.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option)} className="mt-1 size-4 accent-emerald-700" /><span className="min-w-0"><span className="block font-semibold">{option.name}</span>{option.meta ? <span className="block text-xs text-slate-500">{option.meta}</span> : null}</span></label>) : <p className="p-3 text-sm text-slate-500">{open ? "No authorised Evidence matches this search." : "Focus the search box to load recent authorised Evidence."}</p>}</div></div>;
}
