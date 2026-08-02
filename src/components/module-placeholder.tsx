import { CircleDashed } from "lucide-react";

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
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-3xl text-muted">{description}</p>
      </div>
      <section className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-brand">
          <CircleDashed aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">This page is not available</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
          Return to the main menu or contact your organisation administrator if
          you expected to have access.
        </p>
      </section>
    </>
  );
}
