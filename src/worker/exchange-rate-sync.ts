import type { PrismaClient } from "@/generated/prisma/client";
import { fetchBcvExchangeRates } from "@/infrastructure/exchange-rates/bcv-client";
import { logger } from "@/infrastructure/logging/logger";
import { persistBcvSnapshot, recordFailedSync } from "@/modules/exchange-rates/application/exchange-rates";

const caracasClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Caracas",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type ExchangeRateSchedule = { start: string; end: string; intervalMinutes: number };

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function getAutomaticExchangeRateSlot(
  now = new Date(),
  schedule: ExchangeRateSchedule = { start: "18:00", end: "21:00", intervalMinutes: 30 },
) {
  const parts = Object.fromEntries(caracasClock.formatToParts(now).map((part) => [part.type, part.value]));
  if (["Sat", "Sun"].includes(parts.weekday)) return null;
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const startMinutes = minutes(schedule.start);
  const endMinutes = minutes(schedule.end);
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) return null;
  const slotMinutes = startMinutes + Math.floor((currentMinutes - startMinutes) / schedule.intervalMinutes) * schedule.intervalMinutes;
  if (slotMinutes > endMinutes) return null;
  const slotHour = Math.floor(slotMinutes / 60);
  const slotMinute = slotMinutes % 60;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    key: `${date}T${String(slotHour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}-04:00`,
  };
}

export async function runAutomaticExchangeRateSync(prisma: PrismaClient, now = new Date()) {
  const firms = await prisma.firm.findMany({
    select: {
      id: true,
      exchangeRateSyncStart: true,
      exchangeRateSyncEnd: true,
      exchangeRateSyncInterval: true,
      currencies: {
        where: { active: true, source: "BCV", automaticEnabled: true },
        select: { code: true },
      },
    },
  });
  const pending: { firmId: string; currencies: string[]; slot: { date: string; key: string } }[] = [];
  for (const firm of firms) {
    const slot = getAutomaticExchangeRateSlot(now, {
      start: firm.exchangeRateSyncStart,
      end: firm.exchangeRateSyncEnd,
      intervalMinutes: firm.exchangeRateSyncInterval,
    });
    const currencyCodes = firm.currencies.map(({ code }) => code);
    if (!slot || !currencyCodes.length) continue;
    const [alreadyAttempted, futureRates] = await Promise.all([
      prisma.exchangeRateSyncRun.findUnique({
        where: { firmId_scheduleKey: { firmId: firm.id, scheduleKey: slot.key } },
        select: { id: true },
      }),
      prisma.exchangeRate.findMany({
        where: {
          firmId: firm.id,
          currency: { in: currencyCodes },
          sourceKind: "BCV",
          supersededAt: null,
          effectiveDate: { gt: new Date(`${slot.date}T00:00:00.000Z`) },
        },
        distinct: ["currency"],
        select: { currency: true },
      }),
    ]);
    if (!alreadyAttempted && futureRates.length < currencyCodes.length) {
      pending.push({ firmId: firm.id, currencies: currencyCodes, slot });
    }
  }
  if (!pending.length) return;

  try {
    const snapshot = await fetchBcvExchangeRates();
    for (const item of pending) {
      const result = await prisma.$transaction((transaction) => persistBcvSnapshot(transaction, {
        firmId: item.firmId,
        snapshot,
        trigger: "AUTOMATIC",
        scheduleKey: item.slot.key,
        currencies: item.currencies,
      }));
      logger.info({ firmId: item.firmId, slot: item.slot.key, effectiveDate: result.effectiveDate, inserted: result.inserted }, "Sincronización automática BCV completada");
    }
  } catch (error) {
    for (const item of pending) {
      await prisma.$transaction((transaction) => recordFailedSync(transaction, {
        firmId: item.firmId,
        trigger: "AUTOMATIC",
        scheduleKey: item.slot.key,
        error,
      }));
    }
    logger.warn({ error }, "Falló el intento automático de tasas BCV");
  }
}
