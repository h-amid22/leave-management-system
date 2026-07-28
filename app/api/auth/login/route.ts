import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { authService } from "@/services/auth-service";
import { loginSchema } from "@/validators/auth";
import { parseJsonBody } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { auditService } from "@/services/audit-service";
import { getRequestContext } from "@/lib/observability/request-context";
import { InvalidCredentialsError } from "@/lib/auth/errors";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, { scope: "login", limit: 10, windowMs: 60_000 });
    const input = loginSchema.parse(await parseJsonBody(request));
    const user = await authService.login(input);
    await auditService.record({ actor: user, targetEntityType: "User", targetEntityId: user.id, action: "USER_LOGIN_SUCCEEDED", context: getRequestContext(request) });
    return createSuccessResponse(user);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      await auditService.record({ actor: null, targetEntityType: "Authentication", action: "AUTHENTICATION_FAILED", context: getRequestContext(request) });
    }
    return createErrorResponse(error, request);
  }
}
