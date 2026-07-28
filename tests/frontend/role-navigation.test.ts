import { describe, expect, it } from "vitest";

import {
  getNavigationForRole,
  getNavigationGroups,
  isNavigationItemActive,
} from "@/components/layout/app-shell";

describe("role-aware navigation", () => {
  it("does not expose approvals navigation to employees", () => {
    expect(getNavigationForRole("EMPLOYEE").map((item) => item.href)).toEqual([
      "/dashboard",
      "/leave",
      "/leave/new",
    ]);
  });

  it.each(["MANAGER", "HR"] as const)(
    "shows approvals navigation to %s users",
    (role) => {
      expect(getNavigationForRole(role).map((item) => item.href)).toContain(
        "/approvals",
      );
    },
  );

  it("shows Administration only to Admin", () => {
    expect(getNavigationForRole("ADMIN").map((item) => item.href)).toContain("/admin");
    for (const role of ["EMPLOYEE", "MANAGER", "HR"] as const) {
      expect(getNavigationForRole(role).map((item) => item.href)).not.toContain("/admin");
    }
  });

  it("groups all Admin destinations without personal workspace duplication", () => {
    const groups = getNavigationGroups("ADMIN");
    expect(groups.map((group) => group.label)).toEqual(["Overview", "People", "Leave", "System"]);
    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toEqual([
      "/admin", "/admin/employees", "/admin/departments", "/admin/policies",
      "/admin/leave-types", "/admin/balances", "/admin/audit", "/admin/settings",
    ]);
  });

  it("matches exactly one Admin parent for nested routes", () => {
    const items = getNavigationForRole("ADMIN");
    for (const [pathname, expected] of [
      ["/admin", "/admin"],
      ["/admin/employees/new", "/admin/employees"],
      ["/admin/employees/111", "/admin/employees"],
      ["/admin/policies/new", "/admin/policies"],
      ["/admin/balances", "/admin/balances"],
    ]) {
      expect(items.filter((item) => isNavigationItemActive(pathname, item.href)).map((item) => item.href)).toEqual([expected]);
    }
  });
});
