import type { UserRole } from "@/generated/prisma/enums";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId: string | null;
  managerId: string | null;
}
