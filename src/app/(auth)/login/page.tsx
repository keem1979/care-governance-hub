import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-4 text-lg font-semibold">
          <Image
            src="/atom-logo.png"
            alt="ATOM"
            width={112}
            height={112}
            priority
            unoptimized
            className="size-28 rounded-2xl bg-white object-contain"
          />
          <span>Care Governance Hub</span>
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
            <Image
              src="/atom-logo.png"
              alt="ATOM"
              width={88}
              height={88}
              priority
              unoptimized
              className="size-22 rounded-xl border border-border bg-white object-contain"
            />
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
