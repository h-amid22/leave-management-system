import { requireRole } from "@/lib/auth/authorization";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { leaveBalanceService } from "@/services/leave-balance-service";
import { emptyQuerySchema, idParamsSchema } from "@/validators/common";

interface UserBalanceRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: UserBalanceRouteContext,
) {
  try {
    const actor = requireRole(await requireCurrentUser(), [
      "MANAGER",
      "HR",
      "ADMIN",
    ]);
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const { id } = idParamsSchema.parse(await context.params);
    const balances = await leaveBalanceService.getBalancesForUser(actor, id, {
      allowSelf: false,
    });
    return createSuccessResponse(balances);
  } catch (error) {
    return createErrorResponse(error);
  }
}
