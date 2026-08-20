"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StoredCapture = { id: string; capturedAt: string; salt: string; iv: string; ciphertext: string };
type CapturePayload = { clientCaptureId: string; captureType: string; title: string; note: string; capturedAt: string; deviceId: string };
const storageKey = "qcgms:offline-captures:v1", deviceKey = "qcgms:offline-device:v1", field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function OfflineCaptureTool() {
  const [items, setItems] = useState<StoredCapture[]>([]), [passphrase, setPassphrase] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setItems(readQueue()), 0); if ("serviceWorker" in navigator) navigator.serviceWorker.register("/offline-capture-sw.js", { scope: "/offline-capture" }).catch(() => undefined); return () => window.clearTimeout(timer); }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (passphrase.length < 10) { setError("Use an offline passphrase of at least 10 characters."); return; }
    const form = new FormData(event.currentTarget), title = String(form.get("title") ?? "").trim(), note = String(form.get("note") ?? "").trim();
    if (title.length < 4 || note.length < 12) { setError("Enter a clear title and observation note."); return; }
    const deviceId = getDeviceId(), payload: CapturePayload = { clientCaptureId: crypto.randomUUID(), captureType: String(form.get("captureType") ?? "OBSERVATION"), title, note, capturedAt: new Date().toISOString(), deviceId }, encrypted = await encrypt(payload, passphrase), next = [...items, encrypted];
    localStorage.setItem(storageKey, JSON.stringify(next)); setItems(next); event.currentTarget.reset(); setMessage("Saved encrypted on this device. Synchronise it after reconnecting and signing in.");
  }
  async function sync() {
    setBusy(true); setError(""); setMessage("");
    if (passphrase.length < 10) { setError("Enter the passphrase used to encrypt these captures."); setBusy(false); return; }
    const remaining: StoredCapture[] = []; let synced = 0;
    for (const item of items) {
      try {
        const payload = await decrypt(item, passphrase), response = await fetch("/api/connected-governance/offline-captures", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), body = await response.json().catch(() => null);
        if (!response.ok || !body) { remaining.push(item); if (response.status === 401 || response.redirected || !body) throw new Error("Sign in to QCGMS before synchronising."); throw new Error(body.error ?? "One capture could not be synchronised."); }
        synced += 1;
      } catch (reason) { remaining.push(item); setError(reason instanceof Error ? reason.message : "The encrypted queue could not be synchronised."); }
    }
    localStorage.setItem(storageKey, JSON.stringify(remaining)); setItems(remaining); if (synced) setMessage(`${synced} capture${synced === 1 ? "" : "s"} synchronised for management review. No source record was overwritten.`); setBusy(false);
  }
  return <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><form onSubmit={save} className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Capture an observation</h2><p className="mt-1 text-sm text-slate-600">Use this only for governance observations and evidence notes. Do not record medication administration, clinical decisions or urgent safeguarding concerns here.</p><div className="mt-5 grid gap-4"><label className="text-sm font-bold">Capture type<select name="captureType" className={field}><option value="OBSERVATION">Observation</option><option value="ACTION_EVIDENCE">Action evidence note</option><option value="RISK_EVIDENCE">Risk evidence note</option><option value="POLICY_EVIDENCE">Policy evidence note</option><option value="OTHER">Other governance note</option></select></label><label className="text-sm font-bold">Short title<input name="title" maxLength={180} className={field}/></label><label className="text-sm font-bold">What was observed<textarea name="note" maxLength={6000} rows={7} className={field}/></label><label className="text-sm font-bold">Offline encryption passphrase<input type="password" autoComplete="new-password" value={passphrase} onChange={(event)=>setPassphrase(event.target.value)} className={field}/><span className="mt-1 block text-xs font-normal text-slate-500">At least 10 characters. It is never stored or sent to QCGMS.</span></label>{error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>:null}{message?<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</p>:null}<button className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white">Encrypt and save on this device</button></div></form><section className="rounded-2xl border bg-slate-950 p-5 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-emerald-300">Device queue</p><h2 className="mt-1 text-2xl font-black">{items.length} encrypted capture{items.length === 1 ? "" : "s"}</h2><p className="mt-2 text-sm text-slate-300">Only capture IDs and timestamps are visible without your passphrase. Content remains encrypted in this browser.</p><div className="mt-5 space-y-2">{items.map((item)=><div key={item.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs"><strong>{new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.capturedAt))}</strong><p className="mt-1 break-all text-slate-400">{item.id}</p></div>)}</div><button type="button" disabled={!items.length||busy} onClick={sync} className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-slate-950 disabled:opacity-40">{busy?"Synchronising…":"Synchronise for review"}</button><p className="mt-4 text-xs leading-5 text-slate-400">Synchronisation requires a signed-in QCGMS account. A manager must review the capture before it becomes unverified evidence. For urgent risks, follow your organisation’s immediate escalation procedure.</p><Link href="/login?returnTo=%2Fconnected-governance" className="mt-4 inline-block text-sm font-bold text-emerald-300">Sign in to review synced captures →</Link></section></div>;
}

function readQueue(): StoredCapture[] { try { const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function getDeviceId() { let value = localStorage.getItem(deviceKey); if (!value) { value = crypto.randomUUID(); localStorage.setItem(deviceKey, value); } return value; }
function bytes(value: ArrayBuffer) { return btoa(String.fromCharCode(...new Uint8Array(value))); }
function buffer(value: string) { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); }
async function key(passphrase: string, salt: Uint8Array<ArrayBuffer>) { const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]); return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
async function encrypt(payload: CapturePayload, passphrase: string): Promise<StoredCapture> { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(passphrase, salt), new TextEncoder().encode(JSON.stringify(payload))); return { id: payload.clientCaptureId, capturedAt: payload.capturedAt, salt: bytes(salt.buffer), iv: bytes(iv.buffer), ciphertext: bytes(ciphertext) }; }
async function decrypt(item: StoredCapture, passphrase: string): Promise<CapturePayload> { const salt = buffer(item.salt), iv = buffer(item.iv), plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(passphrase, salt), buffer(item.ciphertext)); return JSON.parse(new TextDecoder().decode(plaintext)) as CapturePayload; }
