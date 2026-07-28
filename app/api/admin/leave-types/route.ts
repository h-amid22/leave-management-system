import { requireAdminUser } from "@/lib/auth/admin";
import { createSuccessResponse } from "@/lib/http/api-response";
import { createErrorResponse } from "@/lib/http/error-response";
import { parseJsonBody } from "@/lib/http/request";
import { adminService } from "@/services/admin-service";
import { leaveTypeCreateSchema } from "@/validators/admin";

export async function GET() { try { const actor = await requireAdminUser(); return createSuccessResponse(await adminService.getLeaveTypes(actor)); } catch (error) { return createErrorResponse(error); } }
export async function POST(request: Request) { try { const actor = await requireAdminUser(); const input = leaveTypeCreateSchema.parse(await parseJsonBody(request)); return createSuccessResponse(await adminService.createLeaveType(actor, input), { status: 201 }); } catch (error) { return createErrorResponse(error); } }
