import { PgBoss } from "pg-boss";

import { checkDatabaseHealth } from "@/infrastructure/database/health";
import { getPrisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL es obligatoria para iniciar el worker.");
}

const boss = new PgBoss({
  connectionString,
  schema: "jobs",
  application_name: "proyectoxyz-worker",
});
const prisma = getPrisma();

async function shutdown(signal: string) {
  logger.info({ signal }, "Deteniendo worker");
  await boss.stop({ graceful: true, timeout: 15_000 });
  await prisma.$disconnect();
  process.exit(0);
}

async function main() {
  const database = await checkDatabaseHealth();
  await boss.start();

  logger.info(
    { health: { status: "ok", database, jobsSchema: "jobs" } },
    "Worker saludable",
  );
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  logger.fatal({ error }, "No se pudo iniciar el worker");
  await prisma.$disconnect();
  process.exit(1);
});
