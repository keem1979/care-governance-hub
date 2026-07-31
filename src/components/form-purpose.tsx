export function FormPurpose({ title, description, steps }: { title: string; description: string; steps: string[] }) {
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">What to record</p>
    <h2 className="mt-1 text-lg font-bold text-emerald-950">{title}</h2>
    <p className="mt-1 text-sm leading-6 text-emerald-950">{description}</p>
    <ol className="mt-3 grid gap-2 text-xs text-emerald-900 sm:grid-cols-3">{steps.map((step, index) => <li key={step} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-800 font-bold text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
  </section>;
}
