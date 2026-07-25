export default function KpiLoading() {
  return <div className="animate-pulse space-y-5"><div className="h-24 rounded-2xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-4">{[1,2,3,4].map((item) => <div key={item} className="h-24 rounded-2xl bg-slate-100" />)}</div><div className="h-80 rounded-2xl bg-slate-100" /></div>;
}
