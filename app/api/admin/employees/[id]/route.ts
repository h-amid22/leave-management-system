import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { updateEmployeeSchema } from "@/validators/admin";
import { idParamsSchema } from "@/validators/common";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";

interface Context { params: Promise<{ id: string }>; }
export async function GET(_request: Request, context: Context) { try { const actor = await requireAdminUser(); const { id } = idParamsSchema.parse(await context.params); return createSuccessResponse(await adminService.getEmployee(actor, id)); } catch (error) { return createErrorResponse(error); } }
export async function PATCH(request: Request, context: Context) { try { const actor = await requireAdminUser(); const { id } = idParamsSchema.parse(await context.params); const input = updateEmployeeSchema.parse(await parseJsonBody(request)); const employee = await adminService.updateEmployee(actor, id, input); await auditService.record({ actor, targetEntityType: "User", targetEntityId: id, action: "EMPLOYEE_UPDATED", metadata: { changedFields: Object.keys(input) }, context: getRequestContext(request) }); return createSuccessResponse(employee); } catch (error) { return createErrorResponse(error, request); } }
