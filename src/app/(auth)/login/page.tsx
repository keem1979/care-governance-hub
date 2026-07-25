import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10">
            <ShieldCheck aria-hidden="true" />
          </span>
          Care Governance Hub
        </div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.16em] text-emerald-200 uppercase">
            Clear evidence. Calm governance.
          </p>
          <h1 className="text-5xl leading-tight font-semibold">
            Know what is ready, what is missing and what needs attention.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50/80">
            A secure internal governance workspace for adult social care
            providers. This service does not provide or predict an official CQC
            rating.
          </p>
        </div>
        <p className="text-sm text-emerald-50/65">
          Privacy-conscious by design · Fictional demo data only
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
              <ShieldCheck aria-hidden="true" size={22} />
            </span>
            <span className="font-semibold">Care Governance Hub</span>
          </div>
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            Welcome back
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Sign in to your governance hub
          </h2>
          <p className="mt-3 mb-8 text-muted">
            Use the account supplied by your organisation administrator.
          </p>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-muted">
            Access is logged for security and governance. Do not share your
            account.
          </p>
        </div>
      </section>
    </main>
  );
}
