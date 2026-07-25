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
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
