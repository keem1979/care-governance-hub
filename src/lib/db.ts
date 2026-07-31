import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __QCGMS_DB__: PrismaClient | undefined;
}

export function createDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  if (globalThis.__QCGMS_DB__) return globalThis.__QCGMS_DB__;
  const client = new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });
  // Pages historically call $disconnect() in finally blocks. In a serverless
  // worker that discarded the pool after every request and made every page
  // reconnect to PostgreSQL. Keep one healthy pool for the worker isolate.
  Object.defineProperty(client, "$disconnect", {
    value: async () => undefined,
    configurable: false,
    writable: false,
  });
  globalThis.__QCGMS_DB__ = client;
  return client;
}
