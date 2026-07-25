"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle aria-hidden="true" size={23} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Dashboard could not load</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your data has not been changed. Try loading the dashboard again.
      </p>
      <button
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        onClick={reset}
        type="button"
      >
        <RefreshCw aria-hidden="true" size={17} />
        Try again
      </button>
    </div>
  );
}
