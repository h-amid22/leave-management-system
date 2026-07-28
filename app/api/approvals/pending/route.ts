import { requireRole } from "@/lib/auth/authorization";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { approvalService } from "@/services/approval-service";
import { pendingApprovalQuerySchema } from "@/validators/leave-request";

export async function GET(request: Request) {
  try {
    const actor = requireRole(await requireCurrentUser(), [
      "MANAGER",
      "HR",
      "ADMIN",
    ]);
    const filters = pendingApprovalQuerySchema.parse(
      searchParamsToObject(new URL(request.url).searchParams),
    );
    const result = await approvalService.getPendingRequests(actor, filters);
    return createSuccessResponse(result.data, { meta: result.meta });
  } catch (error) {
    return createErrorResponse(error);
  }
}
