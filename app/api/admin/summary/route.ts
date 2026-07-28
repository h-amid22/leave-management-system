import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { adminService } from "@/services/admin-service";

export async function GET() { try { const actor = await requireAdminUser(); return createSuccessResponse(await adminService.getSummary(actor)); } catch (error) { return createErrorResponse(error); } }
