"use client";

export default function ActivityError({ reset }: { reset: () => void }) {
  return <section className="rounded-2xl border border-red-200 bg-red-50 p-8"><h1 className="text-xl font-bold text-red-900">Activity Log could not load</h1><p className="mt-2 text-sm text-red-700">Try again. Audit records cannot be edited from this page.</p><button onClick={reset} className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white">Try again</button></section>;
}
