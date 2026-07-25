"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Sign in was unsuccessful.");
        return;
      }
      router.replace("/dashboard");
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
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
