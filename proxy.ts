import type { NextRequest } from "next/server";

import { refreshSession } from "@/lib/supabase/proxy";
import { randomUUID } from "node:crypto";
import { observeRequest } from "@/lib/observability/metrics";

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const startedAt = performance.now();
  request.headers.set("x-request-id", requestId);
  const response = await refreshSession(request);
  observeRequest(performance.now() - startedAt, response.status >= 400);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
