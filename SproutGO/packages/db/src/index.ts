// Global Prisma client singleton.
// Serverless (Vercel) opens a new connection per invocation; reusing one client
// instance across invocations avoids "too many connections" (TECH_RISKS R2).
// Runtime URL must be the Supabase pooler (port 6543).

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
