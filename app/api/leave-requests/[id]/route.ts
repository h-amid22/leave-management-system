import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody, searchParamsToObject } from "@/lib/http/request";
import { leaveRequestService } from "@/services/leave-request-service";
import { emptyQuerySchema, idParamsSchema } from "@/validators/common";
import { updateLeaveRequestSchema } from "@/validators/leave-request";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";

interface LeaveRequestRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: LeaveRequestRouteContext,
) {
  try {
    const actor = await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const { id } = idParamsSchema.parse(await context.params);
    const leaveRequest = await leaveRequestService.getRequestById(actor, id);
    return createSuccessResponse(leaveRequest);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: LeaveRequestRouteContext,
) {
  try {
    const actor = await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const { id } = idParamsSchema.parse(await context.params);
    const input = updateLeaveRequestSchema.parse(await parseJsonBody(request));
    const leaveRequest = await leaveRequestService.updatePendingRequest(
      actor,
      id,
      input,
    );
    await auditService.record({ actor, targetEntityType: "LeaveRequest", targetEntityId: id, action: "LEAVE_UPDATED", context: getRequestContext(request) });
    return createSuccessResponse(leaveRequest);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: LeaveRequestRouteContext,
) {
  try {
    const actor = await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const { id } = idParamsSchema.parse(await context.params);
    const leaveRequest = await leaveRequestService.cancelPendingRequest(actor, id);
    await auditService.record({ actor, targetEntityType: "LeaveRequest", targetEntityId: id, action: "LEAVE_CANCELLED", context: getRequestContext(request) });
    return createSuccessResponse(leaveRequest);
  } catch (error) {
    return createErrorResponse(error);
  }
}
