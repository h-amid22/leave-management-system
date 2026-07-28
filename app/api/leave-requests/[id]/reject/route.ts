import { requireRole } from "@/lib/auth/authorization";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody, searchParamsToObject } from "@/lib/http/request";
import { approvalService } from "@/services/approval-service";
import { rejectRequestSchema } from "@/validators/approval";
import { emptyQuerySchema, idParamsSchema } from "@/validators/common";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";
import { incrementMetric } from "@/lib/observability/metrics";

interface RejectionRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RejectionRouteContext) {
  try {
    enforceRateLimit(request, { scope: "leave-reject", limit: 30, windowMs: 60_000 });
    const actor = requireRole(await requireCurrentUser(), [
      "MANAGER",
      "HR",
      "ADMIN",
    ]);
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const { id } = idParamsSchema.parse(await context.params);
    const input = rejectRequestSchema.parse(await parseJsonBody(request));
    const result = await approvalService.rejectRequest(actor, id, input.comment);
    await auditService.record({ actor, targetEntityType: "LeaveRequest", targetEntityId: id, action: "LEAVE_REJECTED", context: getRequestContext(request) });
    incrementMetric("rejections_total");
    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, request);
  }
}
