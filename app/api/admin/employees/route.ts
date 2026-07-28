import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody, searchParamsToObject } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { createEmployeeSchema, employeeQuerySchema } from "@/validators/admin";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";
import { incrementMetric } from "@/lib/observability/metrics";

export async function GET(request: Request) { try { enforceRateLimit(request, { scope: "employee-search", limit: 60, windowMs: 60_000 }); const actor = await requireAdminUser(); const filters = employeeQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams)); const result = await adminService.getEmployees(actor, filters); return createSuccessResponse(result.data, { meta: result.meta }); } catch (error) { return createErrorResponse(error); } }
export async function POST(request: Request) { try { enforceRateLimit(request, { scope: "employee-create", limit: 10, windowMs: 60_000 }); const actor = await requireAdminUser(); const input = createEmployeeSchema.parse(await parseJsonBody(request)); const employee = await adminService.createEmployee(actor, input); await auditService.record({ actor, targetEntityType: "User", targetEntityId: employee.id, action: "EMPLOYEE_CREATED", metadata: { role: input.role }, context: getRequestContext(request) }); incrementMetric("invitations_sent_total"); return createSuccessResponse(employee, { status: 201 }); } catch (error) { return createErrorResponse(error, request); } }
