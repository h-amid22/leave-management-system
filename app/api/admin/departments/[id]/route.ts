import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { departmentInputSchema } from "@/validators/admin";
import { idParamsSchema } from "@/validators/common";

interface Context { params: Promise<{ id: string }>; }
export async function PATCH(request: Request, context: Context) { try { const actor = await requireAdminUser(); const { id } = idParamsSchema.parse(await context.params); const input = departmentInputSchema.partial().refine((value) => Object.keys(value).length > 0).parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.updateDepartment(actor, id, input)); } catch (error) { return createErrorResponse(error); } }
