/**
 * Prisma Client Singleton
 * =======================
 * Prisma documentation recommends creating a single PrismaClient instance
 * and reusing it across your app. This file ensures that happens.
 *
 * In development, hot-reloading can create many PrismaClient instances,
 * which exhausts database connections. We store the instance on the
 * global object to prevent that.
 */

import { PrismaClient } from "@prisma/client";

// TypeScript type for the global object so we can attach prisma to it
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Reuse existing instance if one exists (prevents connection pool exhaustion)
export const prisma = global.prisma || new PrismaClient();

// In development, store the instance on global so hot reloads don't create new ones
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
