import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { balanceQuerySchema } from "@/validators/admin";

export async function GET(request: Request) { try { const actor = await requireAdminUser(); const filters = balanceQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams)); const result = await adminService.getBalances(actor, filters); return createSuccessResponse(result.data, { meta: result.meta }); } catch (error) { return createErrorResponse(error); } }
