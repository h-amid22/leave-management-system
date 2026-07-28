import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { policyUpdateSchema } from "@/validators/admin";
import { idParamsSchema } from "@/validators/common";

interface Context { params: Promise<{ id: string }>; }
export async function PATCH(request: Request, context: Context) { try { const actor = await requireAdminUser(); const { id } = idParamsSchema.parse(await context.params); const input = policyUpdateSchema.parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.updatePolicy(actor, id, input)); } catch (error) { return createErrorResponse(error); } }
