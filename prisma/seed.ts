import { getPrisma } from "../src/infrastructure/database/prisma";

const prisma = getPrisma();

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.info("Seed técnico completado; no se insertaron datos funcionales.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
