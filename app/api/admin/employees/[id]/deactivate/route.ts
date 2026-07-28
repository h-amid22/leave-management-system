import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { adminService } from "@/services/admin-service";
import { idParamsSchema } from "@/validators/common";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";

interface Context { params: Promise<{ id: string }>; }
export async function POST(request: Request, context: Context) { try { const actor = await requireAdminUser(); const { id } = idParamsSchema.parse(await context.params); const employee = await adminService.deactivateEmployee(actor, id); await auditService.record({ actor, targetEntityType: "User", targetEntityId: id, action: "EMPLOYEE_DEACTIVATED", context: getRequestContext(request) }); return createSuccessResponse(employee); } catch (error) { return createErrorResponse(error, request); } }
