import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { db } from "@/db";
import type { UserRole } from "@/generated/prisma/enums";

interface SeedAuthConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
  password: string;
}

interface SeedUserInput {
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  managerId?: string;
}

interface SeededUsers {
  admin: Awaited<ReturnType<typeof upsertApplicationUser>>;
  hr: Awaited<ReturnType<typeof upsertApplicationUser>>;
  manager: Awaited<ReturnType<typeof upsertApplicationUser>>;
  employee: Awaited<ReturnType<typeof upsertApplicationUser>>;
}

interface SeedLeaveTypeInput {
  code: string;
  name: string;
  description: string;
  isPaid: boolean;
  allowanceDays: number;
  maximumCarryOver: number;
}

const seededLeaveTypes: readonly SeedLeaveTypeInput[] = [
  {
    code: "ANNUAL",
    name: "Annual Leave",
    description: "Paid time off for planned personal leave.",
    isPaid: true,
    allowanceDays: 20,
    maximumCarryOver: 5,
  },
  {
    code: "SICK",
    name: "Sick Leave",
    description: "Paid leave for illness, recovery, or medical care.",
    isPaid: true,
    allowanceDays: 14,
    maximumCarryOver: 0,
  },
  {
    code: "UNPAID",
    name: "Unpaid Leave",
    description: "Unpaid time off when paid leave is not applicable.",
    isPaid: false,
    allowanceDays: 30,
    maximumCarryOver: 0,
  },
];

function createSupabaseAdmin(config: SeedAuthConfig) {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  email: string,
): Promise<SupabaseUser | null> {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Unable to list Supabase Auth users: ${error.message}`);
    }

    const existingUser = data.users.find((user) => user.email === email);

    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < perPage) {
      return null;
    }
  }
}

async function ensureAuthUser(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  email: string,
  password: string,
) {
  const existingUser = await findAuthUserByEmail(supabase, email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password },
    );

    if (error) {
      throw new Error(`Unable to update Auth user ${email}: ${error.message}`);
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Unable to create Auth user ${email}: ${error.message}`);
  }

  return data.user;
}

async function upsertApplicationUser(
  config: SeedAuthConfig,
  input: SeedUserInput,
) {
  const supabase = createSupabaseAdmin(config);
  const authUser = await ensureAuthUser(supabase, input.email, config.password);

  return db.user.upsert({
    where: { email: input.email },
    update: {
      authProviderId: authUser.id,
      name: input.name,
      role: input.role,
      isActive: true,
      departmentId: input.departmentId ?? null,
      managerId: input.managerId ?? null,
    },
    create: {
      authProviderId: authUser.id,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      departmentId: input.departmentId,
      managerId: input.managerId,
    },
  });
}

export const seedService = {
  async seedAuthenticationData(config: SeedAuthConfig) {
    const [engineering, humanResources] = await Promise.all([
      db.department.upsert({
        where: { name: "Engineering" },
        update: { isActive: true },
        create: { name: "Engineering" },
      }),
      db.department.upsert({
        where: { name: "Human Resources" },
        update: { isActive: true },
        create: { name: "Human Resources" },
      }),
    ]);

    const admin = await upsertApplicationUser(config, {
      email: "admin@leave.example",
      name: "System Administrator",
      role: "ADMIN",
    });

    const hr = await upsertApplicationUser(config, {
      email: "hr@leave.example",
      name: "HR Administrator",
      role: "HR",
      departmentId: humanResources.id,
    });

    const manager = await upsertApplicationUser(config, {
      email: "manager@leave.example",
      name: "Engineering Manager",
      role: "MANAGER",
      departmentId: engineering.id,
    });

    const employee = await upsertApplicationUser(config, {
      email: "employee@leave.example",
      name: "Engineering Employee",
      role: "EMPLOYEE",
      departmentId: engineering.id,
      managerId: manager.id,
    });

    return { admin, hr, manager, employee };
  },

  async seedLeaveWorkflowData(users: SeededUsers, year: number) {
    const effectiveFrom = new Date(Date.UTC(year, 0, 1));
    const effectiveTo = new Date(Date.UTC(year, 11, 31));

    const leaveTypes = [];

    for (const input of seededLeaveTypes) {
      const leaveType = await db.leaveType.upsert({
        where: { code: input.code },
        update: {
          name: input.name,
          description: input.description,
          isPaid: input.isPaid,
          isActive: true,
        },
        create: {
          code: input.code,
          name: input.name,
          description: input.description,
          isPaid: input.isPaid,
          isActive: true,
        },
      });

      await db.leavePolicy.upsert({
        where: {
          leaveTypeId_effectiveFrom: {
            leaveTypeId: leaveType.id,
            effectiveFrom,
          },
        },
        update: {
          name: `${year} ${input.name} Policy`,
          allowanceDays: input.allowanceDays,
          maximumCarryOver: input.maximumCarryOver,
          allowNegative: false,
          effectiveTo,
        },
        create: {
          leaveTypeId: leaveType.id,
          name: `${year} ${input.name} Policy`,
          allowanceDays: input.allowanceDays,
          maximumCarryOver: input.maximumCarryOver,
          allowNegative: false,
          effectiveFrom,
          effectiveTo,
        },
      });

      leaveTypes.push({ ...leaveType, allowanceDays: input.allowanceDays });
    }

    const seededUsers = [users.admin, users.hr, users.manager, users.employee];

    for (const user of seededUsers) {
      for (const leaveType of leaveTypes) {
        await db.leaveBalance.upsert({
          where: {
            userId_leaveTypeId_year: {
              userId: user.id,
              leaveTypeId: leaveType.id,
              year,
            },
          },
          update: {
            entitledDays: leaveType.allowanceDays,
            carriedDays: 0,
          },
          create: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year,
            entitledDays: leaveType.allowanceDays,
            carriedDays: 0,
            usedDays: 0,
          },
        });
      }
    }

    const employeeBalances = await db.leaveBalance.findMany({
      where: { userId: users.employee.id, year },
      select: {
        entitledDays: true,
        carriedDays: true,
        usedDays: true,
        leaveType: { select: { code: true, name: true } },
      },
      orderBy: { leaveType: { code: "asc" } },
    });

    return {
      year,
      leaveTypes: leaveTypes.map(({ id, code, name, isPaid }) => ({
        id,
        code,
        name,
        isPaid,
      })),
      employeeBalances: employeeBalances.map((balance) => ({
        leaveType: balance.leaveType,
        entitledDays: balance.entitledDays,
        usedDays: balance.usedDays,
        remainingDays: balance.entitledDays
          .plus(balance.carriedDays)
          .minus(balance.usedDays),
      })),
      pendingRequestId: null,
    };
  },
};
