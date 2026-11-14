import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    // Electron supplies DATABASE_URL to the CLI process.
    // The fallback is only for commands that do not connect to a database.
    url: process.env.DATABASE_URL ?? "file:./unused.db",
  },
});
