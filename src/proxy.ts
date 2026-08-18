import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const protectedRoutes = [
  "/dashboard",
  "/clients",
  "/care-plans",
  "/policies",
  "/evidence",
  "/audits",
  "/assessments",
  "/registers",
  "/risks",
  "/actions",
  "/improvement",
  "/workforce",
  "/quality",
  "/data-quality",
  "/meetings",
  "/calendar",
  "/kpis",
  "/inspection",
  "/templates",
  "/reports",
  "/activity",
  "/assurance",
  "/settings",
  "/security",
];

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function addSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}; connect-src 'self' https:; media-src 'self' blob:`,
  );
  if (request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (protectedRoutes.some((route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`))) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

function csrfRejected(request: NextRequest): boolean {
  if (!mutatingMethods.has(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expectedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
    return new URL(origin).host !== expectedHost;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (csrfRejected(request)) {
    const response = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 })
      : new NextResponse("Cross-site request rejected.", { status: 403 });
    return addSecurityHeaders(response, request);
  }

  const protectedRoute = protectedRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`),
  );
  const secret = process.env.SESSION_SECRET;
  const claims = secret
    ? await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret)
    : null;

  if (protectedRoute && !claims) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", request.nextUrl.pathname);
    return addSecurityHeaders(NextResponse.redirect(login), request);
  }

  if (request.nextUrl.pathname === "/login" && claims) {
    const destination = claims.mfaSetupRequired ? "/security" : "/dashboard";
    return addSecurityHeaders(NextResponse.redirect(new URL(destination, request.url)), request);
  }

  if (claims?.mfaSetupRequired) {
    const allowedDuringSetup =
      request.nextUrl.pathname === "/security" ||
      request.nextUrl.pathname.startsWith("/api/settings/security/mfa") ||
      request.nextUrl.pathname.startsWith("/api/auth/logout") ||
      (request.method === "GET" && request.nextUrl.pathname === "/api/settings/policy-branding/logo");
    if (!allowedDuringSetup && request.nextUrl.pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: "Complete MFA setup before using this service." },
          { status: 428 },
        ),
        request,
      );
    }
    if (!allowedDuringSetup && protectedRoute) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/security", request.url)), request);
    }
  }

  return addSecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
