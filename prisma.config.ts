import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma generation does not connect to the database. Sites also keeps
    // runtime secrets out of dependency-install steps, so use a non-routable
    // placeholder there while retaining the real URL for migrations/runtime.
    url: process.env.DATABASE_URL || "postgresql://build:build@127.0.0.1:5432/build",
  },
});
