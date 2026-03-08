import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
  },
});
