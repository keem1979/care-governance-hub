import { NextResponse } from "next/server";
import { answerAssistant } from "@/lib/assistant-knowledge";
import { requireAuthorisedContext } from "@/lib/auth/dal";

export async function POST(request: Request) {
  const context = await requireAuthorisedContext();
  const body = await request.json().catch(() => null) as { query?: unknown; currentPath?: unknown } | null;
  const query = String(body?.query ?? "").trim();
  const currentPath = String(body?.currentPath ?? "");
  if (!query || query.length > 500) return NextResponse.json({ error: "Enter a question up to 500 characters." }, { status: 400 });
  return NextResponse.json(answerAssistant(query, context.permissions, currentPath.startsWith("/") ? currentPath : ""));
}
