// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getEmployees: vi.fn(), getDepartments: vi.fn() }));
vi.mock("@/lib/api/admin-api", () => ({ adminApi: mocks }));
import { EmployeeDirectory } from "@/components/admin/employee-directory";

const employee = { id: "11111111-1111-4111-8111-111111111111", name: "Ada Employee", email: "ada@example.com", role: "EMPLOYEE", employeeNumber: null, isActive: true, departmentId: null, managerId: null, department: null, manager: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const result = (data: typeof employee[] = [employee]) => ({ data, meta: { page: 1, pageSize: 20, total: data.length, totalPages: data.length ? 1 : 0 } });
beforeEach(() => { mocks.getEmployees.mockResolvedValue(result()); mocks.getDepartments.mockResolvedValue([]); });

describe("Admin employee directory", () => {
  it("shows loading then authorized employee data", async () => { render(<EmployeeDirectory />); expect(screen.getByLabelText("Loading employee directory…")).toBeInTheDocument(); expect(await screen.findByText("Ada Employee")).toBeInTheDocument(); expect(screen.getByText("ada@example.com")).toBeInTheDocument(); });
  it("shows an empty state", async () => { mocks.getEmployees.mockResolvedValue(result([])); render(<EmployeeDirectory />); expect(await screen.findByText("No employees found")).toBeInTheDocument(); });
  it("shows API failures safely", async () => { mocks.getEmployees.mockRejectedValue(new Error("Directory unavailable")); render(<EmployeeDirectory />); expect(await screen.findByText("Directory unavailable")).toBeInTheDocument(); });
  it("sends search as a presentation filter", async () => { const user = userEvent.setup(); render(<EmployeeDirectory />); await screen.findByText("Ada Employee"); await user.type(screen.getByLabelText("Search"), "Grace"); await vi.waitFor(() => expect(mocks.getEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Grace" }))); });
});
