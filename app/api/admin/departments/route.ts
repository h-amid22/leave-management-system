import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { departmentInputSchema } from "@/validators/admin";

export async function GET() { try { const actor = await requireAdminUser(); return createSuccessResponse(await adminService.getDepartments(actor)); } catch (error) { return createErrorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireAdminUser(); const input = departmentInputSchema.omit({ isActive: true }).parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.createDepartment(actor, input), { status: 201 }); } catch (error) { return createErrorResponse(error); } }
