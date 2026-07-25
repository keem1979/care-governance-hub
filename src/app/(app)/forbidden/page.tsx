import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
      <ShieldX className="mx-auto text-brand" size={42} />
      <h1 className="mt-5 text-2xl font-semibold">You do not have permission</h1>
      <p className="mt-3 text-muted">
        Your account is active, but this action is outside your assigned role or
        service location.
      </p>
      <Link
        className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2.5 font-semibold text-white"
        href="/dashboard"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
