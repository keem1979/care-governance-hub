"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          mfaCode: mfaRequired ? form.get("mfaCode") : undefined,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        code?: string;
        mfaSetupRequired?: boolean;
      };
      if (!response.ok) {
        if (body.code === "MFA_REQUIRED") setMfaRequired(true);
        setError(body.error ?? "Sign in was unsuccessful.");
        return;
      }
      router.replace(body.mfaSetupRequired ? "/security" : "/dashboard");
      router.refresh();
    } catch {
      setError("The service is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base shadow-sm"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      {mfaRequired ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <label className="mb-2 block text-sm font-semibold" htmlFor="mfaCode">
            Authenticator or recovery code
          </label>
          <input
            className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-base tracking-widest shadow-sm"
            id="mfaCode"
            name="mfaCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={32}
            required
            autoFocus
          />
          <p className="mt-2 text-xs leading-5 text-emerald-900">
            Use the current six-digit code from your authenticator app. A saved
            recovery code can be used once if your device is unavailable.
          </p>
        </div>
      ) : null}
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base shadow-sm"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>
      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        type="submit"
        disabled={pending || !hydrated}
      >
        {!hydrated
          ? "Preparing secure sign-in…"
          : pending
            ? "Signing in…"
            : "Sign in securely"}
      </button>
    </form>
  );
}
