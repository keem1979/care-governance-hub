"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800";

export function ProfilePhotoForm({ endpoint, entityLabel, hasPhoto }: {
  endpoint: string;
  entityLabel: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget;
    try {
      const response = await fetch(endpoint, { method: "POST", body: new FormData(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not upload the profile picture.");
      form.reset();
      setMessage(result.message ?? "Profile picture updated.");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not upload the profile picture.");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Remove this ${entityLabel.toLowerCase()} profile picture?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not remove the profile picture.");
      setMessage(result.message ?? "Profile picture removed.");
      router.refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not remove the profile picture.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-3">
    <label className="block text-sm font-medium">Choose {entityLabel.toLowerCase()} picture
      <input className={field} name="photo" type="file" required accept="image/jpeg,image/png,image/webp" />
    </label>
    <p className="text-xs leading-5 text-slate-500">JPG, PNG or WebP, up to 2 MB. The image is held privately and only shown to authorised users.</p>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}
    <div className="flex flex-wrap gap-2">
      <button disabled={busy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : hasPhoto ? "Replace picture" : "Upload picture"}</button>
      {hasPhoto ? <button type="button" disabled={busy} onClick={remove} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60">Remove picture</button> : null}
    </div>
  </form>;
}
