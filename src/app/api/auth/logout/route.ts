import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const claims = await verifySessionToken(token, getServerEnv().SESSION_SECRET);
  if (claims) {
    await db.$transaction([
      db.session.updateMany({
        where: { id: claims.sessionId, userId: claims.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      db.activityLog.create({
        data: {
          userId: claims.userId,
          action: "LOGOUT",
          recordType: "Session",
          recordId: claims.sessionId,
          summary: "User signed out.",
        },
      }),
    ]);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
