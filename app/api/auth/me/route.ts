import { createSuccessResponse } from "@/lib/http/api-response";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { createErrorResponse } from "@/lib/http/error-response";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return createSuccessResponse(user);
  } catch (error) {
    return createErrorResponse(error);
  }
}
