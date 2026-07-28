// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/employees/new" }));

import { AppShell } from "@/components/layout/app-shell";

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@leave.example",
  name: "System Administrator",
  role: "ADMIN" as const,
  departmentId: null,
  managerId: null,
};

describe("Admin shell navigation", () => {
  it("uses the sidebar as the only desktop Admin navigation", () => {
    render(<AppShell user={admin}><main>Admin content</main></AppShell>);
    expect(screen.queryByRole("navigation", { name: "Administration sections" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Employees" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
  });

  it("opens a keyboard-accessible drawer containing every Admin destination", async () => {
    const user = userEvent.setup();
    render(<AppShell user={admin}><main>Admin content</main></AppShell>);
    const trigger = screen.getByRole("button", { name: "Open Admin navigation" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });
    expect(drawer).toBeInTheDocument();
    for (const label of ["Admin overview", "Employees", "Departments", "Policies", "Leave types", "Balances", "Audit log", "Settings"]) {
      expect(screen.getAllByRole("link", { name: label })).toHaveLength(2);
    }
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
