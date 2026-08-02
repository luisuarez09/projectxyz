import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { fetchBcvExchangeRates, type BcvSnapshot } from "@/infrastructure/exchange-rates/bcv-client";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const manualRateSchema = z.object({
  currency: currencySchema,
  effectiveDate: isoDateSchema,
  rate: z.string().trim().regex(/^\d+(?:[.,]\d{1,8})?$/),
  reason: z.string().trim().min(8).max(500),
});

function assertFirmAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope) throw new AuthorizationError("Las tasas de cambio requieren acceso a toda la firma.");
  requirePermission(auth, permission);
}

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function canonicalDecimal(value: string) {
  return value.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function serializeRate(rate: {
  id: string;
  currency: string;
  rate: { toString(): string };
  effectiveDate: Date;
  sourceKind: "BCV" | "MANUAL";
  sourceUrl: string | null;
  sourcePublishedAt: Date | null;
  capturedAt: Date;
  manualReason: string | null;
  recordedBy: { name: string; email: string } | null;
}) {
  return {
    ...rate,
    rate: rate.rate.toString(),
    effectiveDate: dateKey(rate.effectiveDate),
    sourcePublishedAt: rate.sourcePublishedAt?.toISOString() ?? null,
    capturedAt: rate.capturedAt.toISOString(),
  };
}

export async function listExchangeRates(auth: AuthContext, query: { from?: string | null; to?: string | null }) {
  assertFirmAccess(auth, permissions.firmSettingsRead);
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  today.setUTCDate(today.getUTCDate() - 180);
  const from = isoDateSchema.parse(query.from || today.toISOString().slice(0, 10));
  const to = isoDateSchema.parse(query.to || defaultTo);
  if (from > to) throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");

  return withAuthTransaction(auth, async (transaction) => {
    const [rates, runs, firm, currencies] = await Promise.all([
      transaction.exchangeRate.findMany({
        where: {
          firmId: auth.firmId,
          supersededAt: null,
          effectiveDate: { gte: asDate(from), lte: asDate(to) },
        },
        orderBy: [{ effectiveDate: "desc" }, { currency: "asc" }],
        include: { recordedBy: { select: { name: true, email: true } } },
      }),
      transaction.exchangeRateSyncRun.findMany({
        where: { firmId: auth.firmId },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
      transaction.firm.findUniqueOrThrow({
        where: { id: auth.firmId },
        select: { exchangeRateSyncStart: true, exchangeRateSyncEnd: true, exchangeRateSyncInterval: true },
      }),
      transaction.firmCurrency.findMany({
        where: { firmId: auth.firmId, active: true },
        orderBy: { code: "asc" },
        select: { code: true, name: true, symbol: true, source: true, sourceName: true, sourceUrl: true, automaticEnabled: true },
      }),
    ]);
    return {
      rates: rates.map(serializeRate),
      runs: runs.map((run) => ({
        ...run,
        effectiveDate: run.effectiveDate ? dateKey(run.effectiveDate) : null,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt.toISOString(),
      })),
      range: { from, to },
      currencies,
      automation: {
        timezone: "America/Caracas",
        startsAt: firm.exchangeRateSyncStart,
        endsAt: firm.exchangeRateSyncEnd,
        intervalMinutes: firm.exchangeRateSyncInterval,
      },
    };
  });
}

export async function persistBcvSnapshot(
  transaction: Prisma.TransactionClient,
  input: { firmId: string; snapshot: BcvSnapshot; trigger: "AUTOMATIC" | "MANUAL"; userId?: string; scheduleKey?: string; currencies?: string[] },
) {
  const effectiveDate = asDate(input.snapshot.effectiveDate);
  const requestedCurrencies = input.currencies ?? input.snapshot.rates.map(({ currency }) => currency);
  const snapshotRates = input.snapshot.rates.filter(({ currency }) => requestedCurrencies.includes(currency));
  const missingCurrencies = requestedCurrencies.filter((currency) => !snapshotRates.some((rate) => rate.currency === currency));
  if (missingCurrencies.length) throw new Error(`El BCV no devolvió tasas para: ${missingCurrencies.join(", ")}.`);
  let inserted = 0;

  for (const item of snapshotRates) {
    const current = await transaction.exchangeRate.findFirst({
      where: { firmId: input.firmId, currency: item.currency, effectiveDate, supersededAt: null },
    });
    const unchanged = current?.sourceKind === "BCV"
      && canonicalDecimal(current.rate.toString()) === canonicalDecimal(item.rate);
    if (unchanged) continue;

    const now = new Date();
    if (current) {
      await transaction.exchangeRate.update({ where: { id: current.id }, data: { supersededAt: now } });
    }
    const created = await transaction.exchangeRate.create({
      data: {
        firmId: input.firmId,
        currency: item.currency,
        rate: item.rate,
        effectiveDate,
        sourceKind: "BCV",
        sourceUrl: input.snapshot.sourceUrl,
        sourceHash: input.snapshot.sourceHash,
        sourcePublishedAt: input.snapshot.sourcePublishedAt,
        capturedAt: input.snapshot.capturedAt,
        recordedByUserId: input.userId,
      },
    });
    if (current) {
      await transaction.exchangeRate.update({ where: { id: current.id }, data: { supersededById: created.id } });
    }
    await transaction.auditEvent.create({
      data: {
        firmId: input.firmId,
        actorUserId: input.userId,
        requestId: randomUUID(),
        eventType: "exchange_rate.bcv_recorded",
        entityType: "exchange_rate",
        entityId: created.id,
        metadata: { currency: item.currency, effectiveDate: input.snapshot.effectiveDate, rate: item.rate },
      },
    });
    inserted += 1;
  }

  const run = await transaction.exchangeRateSyncRun.create({
    data: {
      firmId: input.firmId,
      trigger: input.trigger,
      status: inserted ? "SUCCEEDED" : "NO_CHANGE",
      scheduleKey: input.scheduleKey,
      effectiveDate,
      ratesFound: snapshotRates.length,
      initiatedByUserId: input.userId,
    },
  });
  return { inserted, run, effectiveDate: input.snapshot.effectiveDate };
}

export async function recordFailedSync(
  transaction: Prisma.TransactionClient,
  input: { firmId: string; trigger: "AUTOMATIC" | "MANUAL"; userId?: string; scheduleKey?: string; error: unknown },
) {
  const message = input.error instanceof Error ? input.error.message : "No fue posible consultar el BCV.";
  return transaction.exchangeRateSyncRun.create({
    data: {
      firmId: input.firmId,
      trigger: input.trigger,
      status: "FAILED",
      scheduleKey: input.scheduleKey,
      errorMessage: message.slice(0, 500),
      initiatedByUserId: input.userId,
    },
  });
}

export async function syncExchangeRates(auth: AuthContext) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  try {
    const currencies = await withAuthTransaction(auth, (transaction) => transaction.firmCurrency.findMany({
      where: { firmId: auth.firmId, active: true, source: "BCV" },
      select: { code: true },
    }));
    if (!currencies.length) throw new Error("No hay monedas activas conectadas al BCV.");
    const snapshot = await fetchBcvExchangeRates();
    return withAuthTransaction(auth, (transaction) => persistBcvSnapshot(transaction, {
      firmId: auth.firmId,
      snapshot,
      trigger: "MANUAL",
      userId: auth.userId,
      currencies: currencies.map(({ code }) => code),
    }));
  } catch (error) {
    await withAuthTransaction(auth, (transaction) => recordFailedSync(transaction, {
      firmId: auth.firmId,
      trigger: "MANUAL",
      userId: auth.userId,
      error,
    }));
    throw error;
  }
}

export async function createManualExchangeRate(auth: AuthContext, rawInput: unknown) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = manualRateSchema.parse(rawInput);
  const effectiveDate = asDate(input.effectiveDate);
  const normalizedRate = input.rate.replace(",", ".");

  return withAuthTransaction(auth, async (transaction) => {
    const configuredCurrency = await transaction.firmCurrency.findUnique({
      where: { firmId_code: { firmId: auth.firmId, code: input.currency } },
      select: { active: true },
    });
    if (!configuredCurrency?.active) throw new Error("La moneda no está activa en la configuración general.");
    const current = await transaction.exchangeRate.findFirst({
      where: { firmId: auth.firmId, currency: input.currency, effectiveDate, supersededAt: null },
    });
    if (current?.sourceKind === "BCV") {
      throw new Error("Ya existe una tasa oficial del BCV para esa moneda y fecha.");
    }
    const now = new Date();
    if (current) await transaction.exchangeRate.update({ where: { id: current.id }, data: { supersededAt: now } });
    const created = await transaction.exchangeRate.create({
      data: {
        firmId: auth.firmId,
        currency: input.currency,
        rate: normalizedRate,
        effectiveDate,
        sourceKind: "MANUAL",
        manualReason: input.reason,
        recordedByUserId: auth.userId,
        capturedAt: now,
      },
      include: { recordedBy: { select: { name: true, email: true } } },
    });
    if (current) await transaction.exchangeRate.update({ where: { id: current.id }, data: { supersededById: created.id } });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "exchange_rate.manual_recorded",
        entityType: "exchange_rate",
        entityId: created.id,
        metadata: { currency: input.currency, effectiveDate: input.effectiveDate, rate: normalizedRate, reason: input.reason },
      },
    });
    return serializeRate(created);
  });
}

export async function getExchangeRateForOperation(
  transaction: Prisma.TransactionClient,
  input: { firmId: string; currency: string; effectiveDate: Date },
) {
  return transaction.exchangeRate.findFirst({
    where: { ...input, supersededAt: null },
    orderBy: { capturedAt: "desc" },
  });
}
