import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { getDatabaseEnv } from "./lib/env";

// ---------------------------------------------------------
// PRISMA CLIENT INITIALIZATION (FOR PRISMA 7 + POSTGRESQL)
// ---------------------------------------------------------

// Prevents Next.js from creating new database connection pools on every hot-reload
const globalForPrisma = globalThis as unknown as {
  pool: pg.Pool | undefined;
  prisma: PrismaClient | undefined;
};

// 1. Create or reuse the PostgreSQL connection pool (Uses POOLED DATABASE_URL)
const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString: getDatabaseEnv().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// 2. Wrap the pg pool with the Prisma PostgreSQL driver adapter (New in Prisma 7)
const adapter = new PrismaPg(pool);

// 3. Export the unified client instance
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/*
=========================================
💡 HOW TO USE THIS IN YOUR CODE:
=========================================

import { db } from "@/db"; // Import from your root folder

async function exampleQuery() {
  const users = await db.user.findMany();
  return users;
}
*/
