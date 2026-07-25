export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1480px] animate-pulse" aria-label="Loading dashboard">
      <div className="h-64 rounded-3xl bg-slate-200" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div className="h-48 rounded-2xl bg-slate-200" key={index} />
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="h-96 rounded-3xl bg-slate-200" />
        <div className="h-96 rounded-3xl bg-slate-200" />
      </div>
    </div>
  );
}
