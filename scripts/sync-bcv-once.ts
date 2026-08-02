import { getPrisma } from "@/infrastructure/database/prisma";
import { fetchBcvExchangeRates } from "@/infrastructure/exchange-rates/bcv-client";
import { persistBcvSnapshot } from "@/modules/exchange-rates/application/exchange-rates";

const prisma = getPrisma();

try {
  const snapshot = await fetchBcvExchangeRates();
  const firms = await prisma.firm.findMany({
    select: {
      id: true,
      currencies: { where: { active: true, source: "BCV" }, select: { code: true } },
    },
  });
  for (const firm of firms) {
    if (!firm.currencies.length) continue;
    const result = await prisma.$transaction((transaction) => persistBcvSnapshot(transaction, {
      firmId: firm.id,
      snapshot,
      trigger: "AUTOMATIC",
      currencies: firm.currencies.map(({ code }) => code),
    }));
    console.log(JSON.stringify({ effectiveDate: result.effectiveDate, inserted: result.inserted }));
  }
} finally {
  await prisma.$disconnect();
}
