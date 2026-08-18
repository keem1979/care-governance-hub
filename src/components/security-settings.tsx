"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Setup = { secret: string; otpAuthUri: string };

export function SecuritySettings({
  mfaEnabled,
  enabledAt,
  recoveryCodeCount,
  otherActiveSessions,
}: {
  mfaEnabled: boolean;
  enabledAt: string | null;
  recoveryCodeCount: number;
  otherActiveSessions: number;
}) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    const response = await fetch("/api/settings/security/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as {
      error?: string;
      secret?: string;
      otpAuthUri?: string;
      recoveryCodes?: string[];
      revoked?: number;
    };
    if (!response.ok) throw new Error(result.error ?? "The security change could not be completed.");
    return result;
  }

  async function beginSetup() {
    setBusy(true);
    setError(null);
    try {
      const result = await send({ action: "prepare" });
      setSetup({ secret: result.secret!, otpAuthUri: result.otpAuthUri! });
      setMessage("Add the setup key to your authenticator app, then verify it below.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup) return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await send({ action: "enable", setupSecret: setup.secret, code: form.get("code") });
      setRecoveryCodes(result.recoveryCodes ?? []);
      setSetup(null);
      setMessage("MFA is active. Save the recovery codes now; they will not be shown again.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "MFA could not be enabled.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await send({ action: "regenerate_recovery_codes", code: form.get("code") });
      setRecoveryCodes(result.recoveryCodes ?? []);
      setMessage("New recovery codes generated. Every previous recovery code is now invalid.");
      event.currentTarget.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Codes could not be regenerated.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOtherSessions() {
    setBusy(true);
    setError(null);
    try {
      const result = await send({ action: "revoke_other_sessions" });
      setMessage(`${result.revoked ?? 0} other session(s) revoked.`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sessions could not be revoked.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!mfaEnabled ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-xl font-bold text-amber-950">MFA setup required</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-950">
            QCGMS requires an authenticator code at sign-in. Add the account to
            Microsoft Authenticator, Google Authenticator, 1Password or another
            standards-based TOTP app.
          </p>
          {!setup ? (
            <button disabled={busy} onClick={beginSetup} className={primaryButton}>
              Start secure setup
            </button>
          ) : (
            <form onSubmit={enable} className="mt-5 space-y-4 rounded-xl border border-amber-200 bg-white p-5">
              <div>
                <p className="text-sm font-bold">Manual setup key</p>
                <code className="mt-2 block break-all rounded-lg bg-slate-900 px-4 py-3 text-sm tracking-widest text-white">
                  {setup.secret}
                </code>
                <a className="mt-3 inline-block text-sm font-bold text-emerald-800 underline" href={setup.otpAuthUri}>
                  Open in an authenticator app
                </a>
              </div>
              <label className="block text-sm font-bold">
                Six-digit verification code
                <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className={field} />
              </label>
              <button disabled={busy} className={primaryButton}>Verify and enable MFA</button>
            </form>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-emerald-950">MFA is active</h2>
          <p className="mt-2 text-sm text-emerald-950">
            Enabled {enabledAt ?? "for this account"}. {recoveryCodeCount} unused recovery code(s) remain.
          </p>
          <details className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
            <summary className="cursor-pointer font-bold">Replace recovery codes</summary>
            <form onSubmit={regenerate} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm font-bold">Authenticator or recovery code<input name="code" required className={field} /></label>
              <button disabled={busy} className={primaryButton}>Generate new codes</button>
            </form>
          </details>
        </section>
      )}

      {recoveryCodes.length ? (
        <section className="rounded-2xl border-2 border-slate-900 bg-white p-5" aria-live="polite">
          <h2 className="text-xl font-bold">Save these one-time recovery codes</h2>
          <p className="mt-2 text-sm text-slate-600">Store them in an approved password manager. Each code works once and cannot be retrieved later.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {recoveryCodes.map((code) => <code key={code} className="rounded-lg bg-slate-100 px-4 py-3 text-center font-bold tracking-wider">{code}</code>)}
          </div>
          <button onClick={() => window.print()} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Print or save securely</button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Active sessions</h2>
        <p className="mt-2 text-sm text-slate-600">This device remains signed in. {otherActiveSessions} other active session(s) can be revoked immediately.</p>
        <button disabled={busy || otherActiveSessions === 0} onClick={revokeOtherSessions} className="mt-4 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-bold text-red-800 disabled:opacity-50">Revoke other sessions</button>
      </section>

      {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">{message}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">{error}</p> : null}
    </div>
  );
}

const primaryButton = "mt-4 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";
