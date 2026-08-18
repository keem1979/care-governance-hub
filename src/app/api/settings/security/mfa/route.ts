import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthorisedContext } from "@/lib/auth/dal";
import {
  buildOtpAuthUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  matchRecoveryCode,
  verifyTotp,
} from "@/lib/auth/mfa";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { createDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare") }),
  z.object({
    action: z.literal("enable"),
    setupSecret: z.string().regex(/^[A-Z2-7]{32}$/),
    code: z.string().trim().regex(/^\d{6}$/),
  }),
  z.object({
    action: z.literal("regenerate_recovery_codes"),
    code: z.string().trim().min(6).max(32),
  }),
  z.object({ action: z.literal("revoke_other_sessions") }),
]);

export async function POST(request: Request): Promise<NextResponse> {
  const context = await requireAuthorisedContext();
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the security request and try again." }, { status: 400 });
  }

  const env = getServerEnv();
  const keyMaterial = env.MFA_ENCRYPTION_KEY ?? env.SESSION_SECRET;
  if (parsed.data.action === "prepare") {
    const secret =
      process.env.NODE_ENV !== "production" && process.env.E2E_MFA_SECRET
        ? process.env.E2E_MFA_SECRET
        : generateMfaSecret();
    return NextResponse.json({
      secret,
      otpAuthUri: buildOtpAuthUri({
        secret,
        email: context.user.email,
        organisationName: context.organisation.name,
      }),
    });
  }

  const db = createDb();
  try {
    if (parsed.data.action === "enable") {
      const setupSecret = parsed.data.setupSecret;
      if (!verifyTotp(setupSecret, parsed.data.code)) {
        return NextResponse.json(
          { error: "The verification code was not accepted. Check the device time and try again." },
          { status: 400 },
        );
      }
      const recovery = generateRecoveryCodes(keyMaterial);
      const now = new Date();
      const session = await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: context.user.id },
          data: {
            mfaSecretCiphertext: encryptMfaSecret(setupSecret, keyMaterial),
            mfaEnabledAt: now,
            mfaRecoveryCodeHashes: recovery.hashes,
          },
        });
        const updatedSession = await tx.session.update({
          where: { id: context.sessionId },
          data: { mfaVerifiedAt: now },
          select: { expiresAt: true },
        });
        await tx.session.updateMany({
          where: {
            userId: context.user.id,
            id: { not: context.sessionId },
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
        await tx.activityLog.create({
          data: {
            organisationId: context.organisation.id,
            userId: context.user.id,
            action: "UPDATE",
            recordType: "AccountSecurity",
            recordId: context.user.id,
            summary: "Multi-factor authentication enabled; other sessions revoked.",
          },
        });
        return updatedSession;
      });
      const token = await signSession(
        {
          userId: context.user.id,
          sessionId: context.sessionId,
          expiresAt: session.expiresAt.getTime(),
          mfaVerified: true,
          mfaSetupRequired: false,
        },
        env.SESSION_SECRET,
      );
      const response = NextResponse.json({ ok: true, recoveryCodes: recovery.codes });
      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: session.expiresAt,
        priority: "high",
      });
      return response;
    }

    if (parsed.data.action === "regenerate_recovery_codes") {
      const user = await db.user.findUniqueOrThrow({
        where: { id: context.user.id },
        select: {
          mfaSecretCiphertext: true,
          mfaRecoveryCodeHashes: true,
        },
      });
      if (!user.mfaSecretCiphertext) {
        return NextResponse.json({ error: "Enable MFA before generating recovery codes." }, { status: 409 });
      }
      let totpAccepted = false;
      try {
        totpAccepted = verifyTotp(
          decryptMfaSecret(user.mfaSecretCiphertext, keyMaterial),
          parsed.data.code,
        );
      } catch {
        totpAccepted = false;
      }
      const recoveryAccepted = matchRecoveryCode(
        parsed.data.code,
        user.mfaRecoveryCodeHashes,
        keyMaterial,
      );
      if (!totpAccepted && !recoveryAccepted) {
        return NextResponse.json({ error: "The verification code was not accepted." }, { status: 400 });
      }
      const recovery = generateRecoveryCodes(keyMaterial);
      await db.$transaction([
        db.user.update({
          where: { id: context.user.id },
          data: { mfaRecoveryCodeHashes: recovery.hashes },
        }),
        db.activityLog.create({
          data: {
            organisationId: context.organisation.id,
            userId: context.user.id,
            action: "UPDATE",
            recordType: "AccountSecurity",
            recordId: context.user.id,
            summary: "MFA recovery codes regenerated; previous codes invalidated.",
          },
        }),
      ]);
      return NextResponse.json({ ok: true, recoveryCodes: recovery.codes });
    }

    const revoked = await db.session.updateMany({
      where: {
        userId: context.user.id,
        id: { not: context.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await db.activityLog.create({
      data: {
        organisationId: context.organisation.id,
        userId: context.user.id,
        action: "UPDATE",
        recordType: "AccountSecurity",
        recordId: context.user.id,
        summary: `${revoked.count} other active session(s) revoked.`,
      },
    });
    return NextResponse.json({ ok: true, revoked: revoked.count });
  } finally {
    await db.$disconnect();
  }
}
