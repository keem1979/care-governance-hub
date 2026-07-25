import { CircleDashed, LockKeyhole } from "lucide-react";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          Module foundation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-muted">{description}</p>
      </div>
      <section className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-brand">
          <CircleDashed aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Ready for its build milestone</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
          Navigation, authentication and tenant context are active. Operational
          records for this module are deliberately not implemented in Milestone 1.
        </p>
        <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-xl bg-background p-4 text-left text-sm">
          <LockKeyhole className="mt-0.5 shrink-0 text-brand" size={18} />
          <p>
            Future data access must use the central server-side tenant and
            permission guards before returning records.
          </p>
        </div>
      </section>
    </>
  );
}
