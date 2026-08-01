import { getPrisma } from "@/infrastructure/database/prisma";

export async function checkDatabaseHealth() {
  const startedAt = performance.now();
  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: "ok" as const,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
