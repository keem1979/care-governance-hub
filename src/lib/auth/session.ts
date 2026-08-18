import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cgh_session";

export type SessionClaims = {
  userId: string;
  sessionId: string;
  expiresAt: number;
  mfaVerified: boolean;
  mfaSetupRequired: boolean;
};

function sessionKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  claims: SessionClaims,
  secret: string,
): Promise<string> {
  return new SignJWT({
    userId: claims.userId,
    sessionId: claims.sessionId,
    mfaVerified: claims.mfaVerified,
    mfaSetupRequired: claims.mfaSetupRequired,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(claims.expiresAt / 1000))
    .sign(sessionKey(secret));
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(secret), {
      algorithms: ["HS256"],
      currentDate: new Date(now),
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      expiresAt: payload.exp * 1000,
      mfaVerified: payload.mfaVerified === true,
      mfaSetupRequired: payload.mfaSetupRequired === true,
    };
  } catch {
    return null;
  }
}
