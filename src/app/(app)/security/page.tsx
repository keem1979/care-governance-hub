import { SecuritySettings } from "@/components/security-settings";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";

export default async function SecurityPage() {
  const context = await requireAuthorisedContext();
  const db = createDb();
  try {
    const now = new Date();
    const [user, activeSessions] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: context.user.id },
        select: { mfaEnabledAt: true, mfaRecoveryCodeHashes: true },
      }),
      db.session.count({
        where: {
          userId: context.user.id,
          id: { not: context.sessionId },
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }),
    ]);
    return (
      <main className="space-y-7">
        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Account protection</p>
          <h1 className="mt-1 text-3xl font-bold">Security</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Protect access to care-governance and personal information. MFA is
            required for every QCGMS account before the rest of the workspace is available.
          </p>
        </header>
        <SecuritySettings
          mfaEnabled={Boolean(user.mfaEnabledAt)}
          enabledAt={user.mfaEnabledAt?.toLocaleString("en-GB") ?? null}
          recoveryCodeCount={user.mfaRecoveryCodeHashes.length}
          otherActiveSessions={activeSessions}
        />
      </main>
    );
  } finally {
    await db.$disconnect();
  }
}
