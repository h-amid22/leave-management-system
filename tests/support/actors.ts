import type { AuthenticatedUser } from "@/lib/auth/types";

export function createActor(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "employee@leave.example",
    name: "Test Employee",
    role: "EMPLOYEE",
    departmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    managerId: "22222222-2222-4222-8222-222222222222",
    ...overrides,
  };
}
