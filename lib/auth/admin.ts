import "server-only";

import { requireRole } from "@/lib/auth/authorization";
import { requireCurrentUser } from "@/lib/auth/current-user";

export async function requireAdminUser() {
  return requireRole(await requireCurrentUser(), ["ADMIN"]);
}
