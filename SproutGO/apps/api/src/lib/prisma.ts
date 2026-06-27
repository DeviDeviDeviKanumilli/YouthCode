// Re-export the shared Prisma singleton so routes import from one place.
// The singleton lives in @sproutgo/db (TECH_RISKS R2: one client per function).
export { prisma } from "@sproutgo/db";
