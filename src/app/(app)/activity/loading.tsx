export default function ActivityLoading() {
  return <div className="animate-pulse space-y-4"><div className="h-24 rounded-2xl bg-slate-200"/>{[1,2,3,4].map((item) => <div key={item} className="h-36 rounded-2xl bg-slate-100"/>)}</div>;
}
