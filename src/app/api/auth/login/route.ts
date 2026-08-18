import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  decryptMfaSecret,
  matchRecoveryCode,
  verifyTotp,
} from "@/lib/auth/mfa";
import {
  clearLoginAttempts,
  consumeLoginAttempt,
  hashRateLimitKey,
} from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check your email address, password and verification code." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const address = clientAddress(request);
  const fingerprint = hashRateLimitKey(
    `${address}:${parsed.data.email}`,
    env.SESSION_SECRET,
  );
  const db = createDb();

  try {
    const limit = await consumeLoginAttempt(db, fingerprint, {
      maxAttempts: env.AUTH_RATE_LIMIT_ATTEMPTS,
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        mfaSecretCiphertext: true,
        mfaEnabledAt: true,
        mfaRecoveryCodeHashes: true,
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { joinedAt: "asc" },
          take: 1,
          select: { organisationId: true },
        },
      },
    });

    const validPassword =
      user?.isActive === true &&
      user.memberships.length > 0 &&
      (await compare(parsed.data.password, user.passwordHash));

    if (!validPassword || !user) {
      if (user?.memberships[0]) {
        await db.activityLog.create({
          data: {
            organisationId: user.memberships[0].organisationId,
            userId: user.id,
            action: "LOGIN_FAILED",
            recordType: "Session",
            summary: "Sign-in rejected because the credentials were not accepted.",
          },
        });
      }
      return NextResponse.json(
        { error: "Email address or password is incorrect." },
        { status: 401 },
      );
    }

    const mfaEnabled = Boolean(user.mfaEnabledAt && user.mfaSecretCiphertext);
    let usedRecoveryHash: string | null = null;
    if (mfaEnabled) {
      if (!parsed.data.mfaCode) {
        return NextResponse.json(
          {
            code: "MFA_REQUIRED",
            error: "Enter the six-digit code from your authenticator app or a recovery code.",
          },
          { status: 409 },
        );
      }
      const keyMaterial = env.MFA_ENCRYPTION_KEY ?? env.SESSION_SECRET;
      let totpAccepted = false;
      try {
        const secret = decryptMfaSecret(user.mfaSecretCiphertext!, keyMaterial);
        totpAccepted = verifyTotp(secret, parsed.data.mfaCode);
      } catch {
        totpAccepted = false;
      }
      usedRecoveryHash = totpAccepted
        ? null
        : matchRecoveryCode(
            parsed.data.mfaCode,
            user.mfaRecoveryCodeHashes,
            keyMaterial,
          );
      if (!totpAccepted && !usedRecoveryHash) {
        await db.activityLog.create({
          data: {
            organisationId: user.memberships[0].organisationId,
            userId: user.id,
            action: "LOGIN_FAILED",
            recordType: "Session",
            summary: "Sign-in rejected because MFA verification was not accepted.",
          },
        });
        return NextResponse.json(
          { error: "The verification code was not accepted." },
          { status: 401 },
        );
      }
    }

    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
    const verifiedAt = mfaEnabled ? new Date() : null;
    const userAgent = request.headers.get("user-agent")?.slice(0, 250) ?? null;
    const ipHash = hashRateLimitKey(`session-ip:${address}`, env.SESSION_SECRET);
    const session = await db.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: user.id,
          expiresAt,
          mfaVerifiedAt: verifiedAt,
          userAgent,
          ipHash,
        },
        select: { id: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(usedRecoveryHash
            ? {
                mfaRecoveryCodeHashes: user.mfaRecoveryCodeHashes.filter(
                  (hash) => hash !== usedRecoveryHash,
                ),
              }
            : {}),
        },
      });
      await tx.activityLog.create({
        data: {
          organisationId: user.memberships[0].organisationId,
          userId: user.id,
          action: "LOGIN",
          recordType: "Session",
          recordId: created.id,
          summary: mfaEnabled
            ? "User signed in with MFA."
            : "User signed in and must complete MFA setup.",
        },
      });
      return created;
    });

    await clearLoginAttempts(db, fingerprint);
    const mfaSetupRequired = !mfaEnabled;
    const token = await signSession(
      {
        userId: user.id,
        sessionId: session.id,
        expiresAt: expiresAt.getTime(),
        mfaVerified: mfaEnabled,
        mfaSetupRequired,
      },
      env.SESSION_SECRET,
    );
    const response = NextResponse.json({ ok: true, mfaSetupRequired });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      priority: "high",
    });
    return response;
  } finally {
    await db.$disconnect();
  }
}
