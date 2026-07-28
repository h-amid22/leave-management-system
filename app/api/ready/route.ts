import { NextResponse } from "next/server";
import { db } from "@/db";
import { getDatabaseEnv, getSupabaseEnv } from "@/lib/env";
import { getRequestContext } from "@/lib/observability/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { requestId } = getRequestContext(request);
  try {
    getDatabaseEnv(); getSupabaseEnv();
    await db.user.count({ take: 1 });
    return NextResponse.json({ status: "ready", timestamp: new Date().toISOString(), checks: { database: "ok", environment: "ok" }, requestId }, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch {
    return NextResponse.json({ status: "not_ready", timestamp: new Date().toISOString(), checks: { database: "unavailable" }, requestId }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }
}
