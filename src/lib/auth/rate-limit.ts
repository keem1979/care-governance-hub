import { createHmac } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

type AttemptWindow = { attempts: number; resetAt: Date } | null;

export function hashRateLimitKey(key: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`qcgms:auth-rate-limit:${key}`)
    .digest("hex");
}

export function evaluateLoginAttempt(
  current: AttemptWindow,
  options: { maxAttempts: number; windowMs: number; now?: Date },
): {
  allowed: boolean;
  attempts: number;
  resetAt: Date;
  retryAfterSeconds: number;
} {
  const now = options.now ?? new Date();
  if (!current || current.resetAt <= now) {
    return {
      allowed: true,
      attempts: 1,
      resetAt: new Date(now.getTime() + options.windowMs),
      retryAfterSeconds: 0,
    };
  }
  const attempts = current.attempts + 1;
  return {
    allowed: attempts <= options.maxAttempts,
    attempts,
    resetAt: current.resetAt,
    retryAfterSeconds:
      attempts <= options.maxAttempts
        ? 0
        : Math.max(1, Math.ceil((current.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function consumeLoginAttempt(
  db: PrismaClient,
  keyHash: string,
  options: { maxAttempts: number; windowMs: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = new Date();
  const newResetAt = new Date(now.getTime() + options.windowMs);
  const [row] = await db.$queryRaw<Array<{ attempts: number; resetAt: Date }>>(
    Prisma.sql`
      INSERT INTO "AuthRateLimit" ("keyHash", "attempts", "resetAt", "createdAt", "updatedAt")
      VALUES (${keyHash}, 1, ${newResetAt}, ${now}, ${now})
      ON CONFLICT ("keyHash") DO UPDATE SET
        "attempts" = CASE
          WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1
          ELSE "AuthRateLimit"."attempts" + 1
        END,
        "resetAt" = CASE
          WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${newResetAt}
          ELSE "AuthRateLimit"."resetAt"
        END,
        "updatedAt" = ${now}
      RETURNING "attempts", "resetAt"
    `,
  );
  const allowed = row.attempts <= options.maxAttempts;
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function clearLoginAttempts(
  db: PrismaClient,
  keyHash: string,
): Promise<void> {
  await db.authRateLimit.deleteMany({ where: { keyHash } });
}
