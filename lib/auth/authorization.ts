import type { UserRole } from "@/generated/prisma/enums";
import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthenticatedUser } from "@/lib/auth/types";

export function hasRole(
  user: AuthenticatedUser,
  allowedRoles: readonly UserRole[],
) {
  return allowedRoles.includes(user.role);
}

export function requireRole(
  user: AuthenticatedUser,
  allowedRoles: readonly UserRole[],
) {
  if (!hasRole(user, allowedRoles)) {
    throw new AuthorizationError();
  }

  return user;
}
