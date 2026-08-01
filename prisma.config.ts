import "dotenv/config";

import { defineConfig } from "prisma/config";

const migrationUrl =
  process.env.DIRECT_DATABASE_URL ??
  "postgresql://proyectoxyz_migrator:local_migrator_password@localhost:55432/proyectoxyz";

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
