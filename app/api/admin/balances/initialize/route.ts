import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { initializeBalancesSchema } from "@/validators/admin";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) { try { enforceRateLimit(request, { scope: "balance-initialize", limit: 5, windowMs: 60_000 }); const actor = await requireAdminUser(); const input = initializeBalancesSchema.parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.initializeBalances(actor, input.year, input.preview)); } catch (error) { return createErrorResponse(error); } }
