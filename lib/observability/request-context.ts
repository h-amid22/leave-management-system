import { randomUUID } from "node:crypto";

export interface RequestContext {
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export function getRequestContext(request?: Request): RequestContext {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    requestId: request?.headers.get("x-request-id") || randomUUID(),
    ipAddress: forwarded || request?.headers.get("x-real-ip") || null,
    userAgent: request?.headers.get("user-agent")?.slice(0, 500) || null,
  };
}
