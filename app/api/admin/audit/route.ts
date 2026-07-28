import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { auditService } from "@/services/audit-service";
import { auditQuerySchema } from "@/validators/audit";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminUser();
    const filters = auditQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const result = await auditService.list(actor, filters);
    return createSuccessResponse(result.data, { meta: result.meta });
  } catch (error) { return createErrorResponse(error, request); }
}
