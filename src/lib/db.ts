import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/*
 * Prisma 7 connects through a driver adapter. Moving to Postgres later means
 * swapping this adapter for @prisma/adapter-pg -- nothing else in the app
 * refers to the database engine.
 */
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
    }),
  });

// Next's dev server reloads modules on every edit; without this the process
// would accumulate a new connection pool per reload.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
