import { randomUUID } from "node:crypto";

import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import {
  AuthorizationError,
  requirePermission,
} from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);

const supportedBcvCurrencies = new Set(["USD", "EUR", "CNY", "TRY", "RUB"]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const nullableCurrencyText = (maximum: number) => z.union([z.string().trim().max(maximum), z.null()]).transform((value) => value || null);
const firmCurrencySchema = z.object({
  id: z.uuid().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  name: z.string().trim().min(2).max(80),
  symbol: nullableCurrencyText(8),
  source: z.enum(["BCV", "MANUAL", "EXTERNAL"]),
  sourceName: nullableCurrencyText(120),
  sourceUrl: z.union([z.literal(""), z.url().startsWith("https://"), z.null()]).transform((value) => value || null),
  automaticEnabled: z.boolean(),
  active: z.boolean(),
}).superRefine((currency, context) => {
  if (currency.source === "BCV" && !supportedBcvCurrencies.has(currency.code)) {
    context.addIssue({ code: "custom", path: ["code"], message: "El BCV no publica esta moneda en su página principal." });
  }
  if (currency.source === "EXTERNAL" && (!currency.sourceName || !currency.sourceUrl)) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "Indica el nombre y enlace de la fuente externa." });
  }
  if (currency.automaticEnabled && (currency.source !== "BCV" || !currency.active)) {
    context.addIssue({ code: "custom", path: ["automaticEnabled"], message: "Solo una moneda BCV activa puede consultarse automáticamente." });
  }
});

export const firmGeneralSettingsSchema = z.object({
  version: z.number().int().positive(),
  entityType: z.enum(["NATURAL_PERSON", "LEGAL_ENTITY"]),
  legalName: z.string().trim().min(2).max(200),
  tradeName: nullableText(200),
  rif: z.string().trim().toUpperCase().min(5).max(24),
  fiscalAddress: nullableText(500),
  email: z
    .union([z.literal(""), z.email()])
    .transform((value) => value || null),
  phone: nullableText(40),
  pdfHeader: nullableText(500),
  pdfFooter: nullableText(300),
  archivePaperSize: z.enum(["LETTER", "A4", "LEGAL_OFFICIO"]),
  exchangeRateSyncStart: timeSchema,
  exchangeRateSyncEnd: timeSchema,
  exchangeRateSyncInterval: z.union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)]),
  currencies: z.array(firmCurrencySchema).max(20),
}).superRefine((settings, context) => {
  if (settings.exchangeRateSyncStart >= settings.exchangeRateSyncEnd) {
    context.addIssue({ code: "custom", path: ["exchangeRateSyncEnd"], message: "La hora final debe ser posterior a la inicial." });
  }
  const codes = settings.currencies.map(({ code }) => code);
  if (new Set(codes).size !== codes.length) {
    context.addIssue({ code: "custom", path: ["currencies"], message: "No puede repetirse el código de una moneda." });
  }
});

function assertFirmAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope)
    throw new AuthorizationError(
      "La configuración requiere acceso a toda la firma.",
    );
  requirePermission(auth, permission);
}

const firmGeneralSelect = {
  id: true,
  version: true,
  entityType: true,
  legalName: true,
  tradeName: true,
  rif: true,
  fiscalAddress: true,
  email: true,
  phone: true,
  pdfHeader: true,
  pdfFooter: true,
  archivePaperSize: true,
  exchangeRateSyncStart: true,
  exchangeRateSyncEnd: true,
  exchangeRateSyncInterval: true,
  currencies: {
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      symbol: true,
      source: true,
      sourceName: true,
      sourceUrl: true,
      automaticEnabled: true,
      active: true,
      version: true,
    },
  },
  logoStoredObject: {
    select: { id: true, originalName: true, status: true },
  },
  updatedAt: true,
} as const;

export async function getFirmGeneralSettings(auth: AuthContext) {
  assertFirmAccess(auth, permissions.firmSettingsRead);
  return withAuthTransaction(auth, (transaction) =>
    transaction.firm.findUniqueOrThrow({
      where: { id: auth.firmId },
      select: firmGeneralSelect,
    }),
  );
}

export async function saveFirmGeneralSettings(
  auth: AuthContext,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = firmGeneralSettingsSchema.parse(rawInput);

  return withAuthTransaction(auth, async (transaction) => {
    const existingCurrencies = await transaction.firmCurrency.findMany({
      where: { firmId: auth.firmId },
      select: { id: true, code: true },
    });
    const existingById = new Map(existingCurrencies.map((currency) => [currency.id, currency]));
    for (const currency of input.currencies) {
      if (!currency.id) continue;
      const existing = existingById.get(currency.id);
      if (!existing) throw new Error("Una de las monedas ya no pertenece a esta firma.");
      if (existing.code !== currency.code) throw new Error("El código de una moneda guardada no puede modificarse.");
    }

    const result = await transaction.firm.updateMany({
      where: { id: auth.firmId, version: input.version },
      data: {
        entityType: input.entityType,
        legalName: input.legalName,
        tradeName: input.tradeName,
        rif: input.rif,
        fiscalAddress: input.fiscalAddress,
        email: input.email,
        phone: input.phone,
        pdfHeader: input.pdfHeader,
        pdfFooter: input.pdfFooter,
        archivePaperSize: input.archivePaperSize,
        exchangeRateSyncStart: input.exchangeRateSyncStart,
        exchangeRateSyncEnd: input.exchangeRateSyncEnd,
        exchangeRateSyncInterval: input.exchangeRateSyncInterval,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new Error(
        "La configuración cambió en otra sesión. Recarga la página antes de guardar.",
      );
    }

    for (const currency of input.currencies) {
      const sourceData = currency.source === "BCV"
        ? { sourceName: "Banco Central de Venezuela", sourceUrl: "https://www.bcv.org.ve/" }
        : currency.source === "EXTERNAL"
          ? { sourceName: currency.sourceName, sourceUrl: currency.sourceUrl }
          : { sourceName: null, sourceUrl: null };
      const data = {
        name: currency.name,
        symbol: currency.symbol,
        source: currency.source,
        ...sourceData,
        automaticEnabled: currency.source === "BCV" && currency.active && currency.automaticEnabled,
        active: currency.active,
      };
      if (currency.id) {
        await transaction.firmCurrency.update({
          where: { id: currency.id },
          data: { ...data, version: { increment: 1 } },
        });
      } else {
        await transaction.firmCurrency.create({
          data: { firmId: auth.firmId, code: currency.code, ...data },
        });
      }
    }

    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "firm.general_settings.updated",
        entityType: "firm",
        entityId: auth.firmId,
        metadata: {
          version: input.version + 1,
          entityType: input.entityType,
          archivePaperSize: input.archivePaperSize,
          exchangeRateSchedule: {
            start: input.exchangeRateSyncStart,
            end: input.exchangeRateSyncEnd,
            intervalMinutes: input.exchangeRateSyncInterval,
          },
          currencies: input.currencies.map(({ code, source, automaticEnabled, active }) => ({ code, source, automaticEnabled, active })),
        },
      },
    });

    return transaction.firm.findUniqueOrThrow({
      where: { id: auth.firmId },
      select: firmGeneralSelect,
    });
  });
}
