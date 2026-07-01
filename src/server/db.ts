import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads in development to avoid
// exhausting the database connection pool. In production a fresh instance
// is created per server process.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
