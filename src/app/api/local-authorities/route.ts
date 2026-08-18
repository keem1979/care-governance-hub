import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { ONS_LOCAL_AUTHORITY_SOURCE, searchUkLocalAuthorities } from "@/lib/uk-local-authorities";

export async function GET(request: Request) {
  await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const includeHistoric = new URL(request.url).searchParams.get("includeHistoric") === "true";
  try {
    const authorities = await searchUkLocalAuthorities(query, fetch, includeHistoric);
    return NextResponse.json({ authorities, source: ONS_LOCAL_AUTHORITY_SOURCE });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not search the authority directory." },
      { status: 502 },
    );
  }
}
