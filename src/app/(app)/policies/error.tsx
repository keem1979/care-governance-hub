"use client";
export default function PoliciesError({ reset }: { reset: () => void }) {
  return <main className="rounded-2xl border border-red-200 bg-white p-8"><h1 className="text-2xl font-bold">Policy Library is temporarily unavailable</h1><p className="mt-2 text-slate-600">Your data has not been changed. Please try again.</p><button onClick={reset} className="mt-5 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">Try again</button></main>;
}
