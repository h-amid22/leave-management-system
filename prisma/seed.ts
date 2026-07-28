import "dotenv/config";

import { z } from "zod";

import { db } from "../db";
import { seedService } from "../services/seed-service";

const seedEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SEED_USER_PASSWORD: z
    .string()
    .min(12)
    .max(128)
    .regex(/[a-z]/, "must contain a lowercase letter")
    .regex(/[A-Z]/, "must contain an uppercase letter")
    .regex(/[0-9]/, "must contain a number"),
});

async function main() {
  const env = seedEnvSchema.parse(process.env);

  if (env.NODE_ENV === "production") {
    throw new Error("Authentication seed cannot run in production");
  }

  const users = await seedService.seedAuthenticationData({
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    password: env.SEED_USER_PASSWORD,
  });

  const leaveData = await seedService.seedLeaveWorkflowData(
    users,
    new Date().getUTCFullYear(),
  );

  console.info("Development seed summary");
  console.info("Accounts:");
  console.info(`- ${users.admin.email} (${users.admin.role})`);
  console.info(`- ${users.hr.email} (${users.hr.role})`);
  console.info(`- ${users.manager.email} (${users.manager.role})`);
  console.info(`- ${users.employee.email} (${users.employee.role})`);
  console.info("Leave types:");

  for (const leaveType of leaveData.leaveTypes) {
    console.info(
      `- ${leaveType.code}: ${leaveType.name} (${leaveType.isPaid ? "paid" : "unpaid"})`,
    );
  }

  console.info(`Employee balances for ${leaveData.year}:`);

  for (const balance of leaveData.employeeBalances) {
    console.info(
      `- ${balance.leaveType.code}: ${balance.remainingDays.toString()} remaining ` +
        `(${balance.usedDays.toString()} used of ${balance.entitledDays.toString()})`,
    );
  }

  console.info("Seeded pending request: none (create one through the API)");
  console.info("Login password: use the value configured in SEED_USER_PASSWORD");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("Seed failed", error);
    await db.$disconnect();
    process.exitCode = 1;
  });
