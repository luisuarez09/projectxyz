import { PgBoss } from "pg-boss";

import { checkDatabaseHealth } from "@/infrastructure/database/health";
import { getPrisma } from "@/infrastructure/database/prisma";
import { logger } from "@/infrastructure/logging/logger";
import { getPrivateObject } from "@/infrastructure/object-storage/s3-private-storage";
import { scanWithClamAv } from "@/infrastructure/security/clamav";
import { runAutomaticExchangeRateSync } from "@/worker/exchange-rate-sync";

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
let scanTimer: NodeJS.Timeout | undefined;
let exchangeRateTimer: NodeJS.Timeout | undefined;
let scanning = false;
let syncingExchangeRates = false;

async function scanNextStoredObject() {
  if (scanning) return false;
  scanning = true;
  try {
    const storedObject = await prisma.storedObject.findFirst({
      where: { status: "QUARANTINED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, objectKey: true, originalName: true },
    });
    if (!storedObject) return false;

    const bytes = await getPrivateObject(storedObject.objectKey);
    const result = await scanWithClamAv(bytes);
    const now = new Date();
    await prisma.storedObject.updateMany({
      where: { id: storedObject.id, status: "QUARANTINED" },
      data: result.clean
        ? { status: "AVAILABLE", scannedAt: now, availableAt: now, rejectionReason: null }
        : { status: "REJECTED", scannedAt: now, rejectionReason: result.detail.slice(0, 500) },
    });
    logger.info(
      { storedObjectId: storedObject.id, originalName: storedObject.originalName, clean: result.clean },
      result.clean ? "Archivo validado y disponible" : "Archivo rechazado por seguridad",
    );
    return true;
  } catch (error) {
    logger.warn({ error }, "No se pudo completar la validación de un archivo en cuarentena");
    return false;
  } finally {
    scanning = false;
  }
}

async function scanLoop() {
  const processed = await scanNextStoredObject();
  scanTimer = setTimeout(() => void scanLoop(), processed ? 250 : 5_000);
}

async function exchangeRateLoop() {
  if (!syncingExchangeRates) {
    syncingExchangeRates = true;
    try {
      await runAutomaticExchangeRateSync(prisma);
    } catch (error) {
      logger.warn({ error }, "No se pudo evaluar la sincronización automática de tasas");
    } finally {
      syncingExchangeRates = false;
    }
  }
  exchangeRateTimer = setTimeout(() => void exchangeRateLoop(), 60_000);
}

async function shutdown(signal: string) {
  logger.info({ signal }, "Deteniendo worker");
  if (scanTimer) clearTimeout(scanTimer);
  if (exchangeRateTimer) clearTimeout(exchangeRateTimer);
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
  void scanLoop();
  void exchangeRateLoop();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  logger.fatal({ error }, "No se pudo iniciar el worker");
  await prisma.$disconnect();
  process.exit(1);
});
