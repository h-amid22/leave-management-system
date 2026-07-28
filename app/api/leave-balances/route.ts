import { requireCurrentUser } from "@/lib/auth/current-user";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { searchParamsToObject } from "@/lib/http/request";
import { leaveBalanceService } from "@/services/leave-balance-service";
import { emptyQuerySchema } from "@/validators/common";

export async function GET(request: Request) {
  try {
    const actor = await requireCurrentUser();
    emptyQuerySchema.parse(searchParamsToObject(new URL(request.url).searchParams));
    const balances = await leaveBalanceService.getBalancesForUser(actor);
    return createSuccessResponse(balances);
  } catch (error) {
    return createErrorResponse(error);
  }
}
