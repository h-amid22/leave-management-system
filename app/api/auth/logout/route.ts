import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { authService } from "@/services/auth-service";

export async function POST() {
  try {
    await authService.logout();
    return createSuccessResponse({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
