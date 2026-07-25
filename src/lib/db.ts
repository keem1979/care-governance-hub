import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type DatabaseGlobal = typeof globalThis & {
  careGovernanceDb?: PrismaClient;
};

const databaseGlobal = globalThis as DatabaseGlobal;

function createPooledClient(connectionString: string): PrismaClient {
  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
    }),
  });

  // Request handlers historically call `$disconnect()` in `finally` blocks.
  // A shared serverless client must keep its pool available between requests;
  // the worker runtime releases it when the isolate is retired.
  Object.defineProperty(client, "$disconnect", {
    configurable: false,
    value: async () => undefined,
    writable: false,
  });

  return client;
}

export function createDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  databaseGlobal.careGovernanceDb ??= createPooledClient(connectionString);
  return databaseGlobal.careGovernanceDb;
}
