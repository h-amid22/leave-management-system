import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody, searchParamsToObject } from "@/lib/http/request";
import { leaveRequestService } from "@/services/leave-request-service";
import { emptyQuerySchema } from "@/validators/common";
import {
  createLeaveRequestSchema,
  leaveRequestQuerySchema,
} from "@/validators/leave-request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";
import { incrementMetric } from "@/lib/observability/metrics";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, { scope: "leave-request-create", limit: 10, windowMs: 60_000 });
    const actor = await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const input = createLeaveRequestSchema.parse(await parseJsonBody(request));
    const leaveRequest = await leaveRequestService.createLeaveRequest(actor, input);
    await auditService.record({ actor, targetEntityType: "LeaveRequest", targetEntityId: leaveRequest.id, action: "LEAVE_SUBMITTED", metadata: { leaveTypeId: input.leaveTypeId }, context: getRequestContext(request) });
    incrementMetric("leave_requests_created_total");
    return createSuccessResponse(leaveRequest, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, request);
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireCurrentUser();
    const filters = leaveRequestQuerySchema.parse(
      searchParamsToObject(new URL(request.url).searchParams),
    );
    const result = await leaveRequestService.getRequestHistory(actor, filters);
    return createSuccessResponse(result.data, { meta: result.meta });
  } catch (error) {
    return createErrorResponse(error);
  }
}
