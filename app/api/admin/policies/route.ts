import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody, searchParamsToObject } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { policyCreateSchema, policyQuerySchema } from "@/validators/admin";

export async function GET(request: Request) { try { const actor = await requireAdminUser(); const filters = policyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams)); const result = await adminService.getPolicies(actor, filters); return createSuccessResponse(result.data, { meta: result.meta }); } catch (error) { return createErrorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireAdminUser(); const input = policyCreateSchema.parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.createPolicy(actor, input), { status: 201 }); } catch (error) { return createErrorResponse(error); } }
