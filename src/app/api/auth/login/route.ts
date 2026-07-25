import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  clearLoginAttempts,
  consumeLoginAttempt,
} from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

function requestFingerprint(request: Request, email: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded ?? "local"}:${email}`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check your email address and password." },
      { status: 400 },
    );
  }

  const env = getServerEnv();
  const fingerprint = requestFingerprint(request, parsed.data.email);
  const limit = consumeLoginAttempt(fingerprint, {
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
      memberships: {
        where: { status: "ACTIVE" },
        take: 1,
        select: { organisationId: true },
      },
    },
  });

  const valid =
    user?.isActive === true &&
    user.memberships.length > 0 &&
    (await compare(parsed.data.password, user.passwordHash));

  if (!valid || !user) {
    return NextResponse.json(
      { error: "Email address or password is incorrect." },
      { status: 401 },
    );
  }

  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);
  const userAgent = request.headers.get("user-agent")?.slice(0, 250) ?? null;
  const session = await db.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: { userId: user.id, expiresAt, userAgent },
      select: { id: true },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await tx.activityLog.create({
      data: {
        organisationId: user.memberships[0].organisationId,
        userId: user.id,
        action: "LOGIN",
        recordType: "Session",
        recordId: created.id,
        summary: "User signed in.",
      },
    });
    return created;
  });

  clearLoginAttempts(fingerprint);
  const token = await signSession(
    { userId: user.id, sessionId: session.id, expiresAt: expiresAt.getTime() },
    env.SESSION_SECRET,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
  return response;
}
