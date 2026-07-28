import "server-only";

import { db } from "@/db";
import { AuthorizationError } from "@/lib/auth/errors";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { UserNotFoundError } from "@/services/user-domain-errors";

const authenticatedUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  departmentId: true,
  managerId: true,
} as const;

export const userService = {
  async findActiveByAuthProviderId(
    authProviderId: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await db.user.findUnique({
      where: { authProviderId, isActive: true },
      select: authenticatedUserSelect,
    });

    return user;
  },

  async requireAccessibleUser(
    actor: AuthenticatedUser,
    targetUserId: string,
    options: { allowSelf?: boolean } = {},
  ): Promise<AuthenticatedUser> {
    const target = await db.user.findFirst({
      where: { id: targetUserId, isActive: true },
      select: authenticatedUserSelect,
    });

    if (!target) {
      throw new UserNotFoundError();
    }

    if (actor.id === target.id) {
      if (options.allowSelf ?? true) {
        return target;
      }

      throw new AuthorizationError();
    }

    if (actor.role === "HR" || actor.role === "ADMIN") {
      return target;
    }

    const hasManagerScope =
      actor.role === "MANAGER" &&
      actor.departmentId !== null &&
      target.managerId === actor.id &&
      target.departmentId === actor.departmentId;

    if (!hasManagerScope) {
      throw new AuthorizationError(
        "Managers may only access employees they directly supervise",
      );
    }

    return target;
  },
};
