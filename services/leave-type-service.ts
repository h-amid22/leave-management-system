import "server-only";

import { db } from "@/db";

export class LeaveTypeService {
  async getActiveLeaveTypes() {
    return db.leaveType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isPaid: true,
      },
      orderBy: { name: "asc" },
    });
  }
}

export const leaveTypeService = new LeaveTypeService();
