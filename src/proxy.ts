import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const protectedRoutes = [
  "/dashboard",
  "/policies",
  "/evidence",
  "/audits",
  "/registers",
  "/risks",
  "/actions",
  "/meetings",
  "/calendar",
  "/kpis",
  "/inspection",
  "/templates",
  "/reports",
  "/activity",
  "/settings",
];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const protectedRoute = protectedRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`),
  );
  const secret = process.env.SESSION_SECRET;
  const claims = secret
    ? await verifySessionToken(
        request.cookies.get(SESSION_COOKIE)?.value,
        secret,
      )
    : null;

  if (protectedRoute && !claims) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (request.nextUrl.pathname === "/login" && claims) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/policies")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Referrer-Policy", "same-origin");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
