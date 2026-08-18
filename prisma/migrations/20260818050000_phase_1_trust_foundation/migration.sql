ALTER TABLE "User"
  ADD COLUMN "mfaSecretCiphertext" TEXT,
  ADD COLUMN "mfaEnabledAt" TIMESTAMP(3),
  ADD COLUMN "mfaRecoveryCodeHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Session"
  ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

-- Force every pre-Phase-1 session through the new MFA-aware sign-in flow.
UPDATE "Session"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL;

CREATE TABLE "AuthRateLimit" (
  "keyHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("keyHash")
);

CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");
