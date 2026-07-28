import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { leaveTypeService } from "@/services/leave-type-service";
import { emptyQuerySchema } from "@/validators/common";

export async function GET(request: Request) {
  try {
    await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const leaveTypes = await leaveTypeService.getActiveLeaveTypes();
    return createSuccessResponse(leaveTypes);
  } catch (error) {
    return createErrorResponse(error);
  }
}
