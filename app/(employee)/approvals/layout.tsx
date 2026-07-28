import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/lib/auth/current-user";

const approvalRoles = new Set(["MANAGER", "HR", "ADMIN"]);

export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/approvals");
  }

  if (!approvalRoles.has(user.role)) {
    redirect("/forbidden");
  }

  return children;
}
