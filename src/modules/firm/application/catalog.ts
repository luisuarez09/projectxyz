import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import {
  AuthorizationError,
  requirePermission,
} from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const evidenceRequirementSchema = z.object({
  kind: z.enum([
    "SOLVENCY",
    "DECLARATION_RECEIPT",
    "DECLARATION_FILE",
    "PAYMENT_FORM",
    "PAYMENT_RECEIPT",
  ]),
  required: z.boolean(),
});

const dateText = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "La fecha no es válida.",
  );
const nullableDate = dateText.transform((value) =>
  value ? new Date(`${value}T00:00:00.000Z`) : null,
);
const deadlineSchema = z.object({
  mode: z.enum(["days", "official-calendar", "document-date"]),
  dayCount: z.number().int().min(0).max(366),
  dayType: z.enum(["business", "calendar"]),
  base: z
    .enum(["period-start", "next-period-start", "period-end", "document-date"])
    .transform((value) =>
      value === "next-period-start" ? ("period-start" as const) : value,
    ),
});
const offeringFields = z.object({
  key: z.string().trim().max(100).optional(),
  kind: z.enum(["TAX", "SERVICE"]),
  taxpayerCondition: z
    .enum(["ORDINARY", "SPECIAL_TAXPAYER", "ALL"])
    .default("ALL"),
  name: z.string().trim().min(2).max(180),
  organism: z.string().trim().min(2).max(180),
  frequency: z.string().trim().min(2).max(80),
  speFrequency: z.string().trim().max(80).default("No aplica"),
  speCalendarGroup: z.string().trim().max(100).default(""),
  deadline: deadlineSchema,
  evidenceRequirements: z
    .array(evidenceRequirementSchema)
    .max(5)
    .refine(
      (requirements) =>
        new Set(requirements.map(({ kind }) => kind)).size ===
        requirements.length,
      "No repitas tipos de soporte.",
    )
    .default([]),
  template: z
    .enum(["iva", "dpp", "inces", "ivss", "faov", "none"])
    .default("none"),
  source: z.string().trim().max(500).default(""),
  appliesFrom: nullableDate,
  appliesTo: nullableDate,
  active: z.boolean(),
  archiveOrder: z.number().int().min(1).max(9999).default(1000),
});
const createOfferingSchema = offeringFields;
const updateOfferingSchema = offeringFields.extend({
  version: z.number().int().positive(),
});
const archiveOrderSchema = z.object({
  kind: z.enum(["TAX", "SERVICE"]),
  orderedIds: z
    .array(z.uuid())
    .min(1)
    .max(200)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "No repitas elementos en el orden de archivo.",
    ),
});
const taxRateSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  version: z.number().int().positive().optional(),
  offeringId: z.uuid(),
  name: z.string().trim().min(2).max(180),
  rate: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "La alícuota no es válida.")
    .transform((value) => value.replace(",", ".")),
  appliesFrom: nullableDate,
  appliesTo: nullableDate,
  source: z.string().trim().max(500).default(""),
  active: z.boolean().default(false),
});
const saveTaxRatesSchema = z.object({ rates: z.array(taxRateSchema).max(50) });
const calendarDatesSchema = z.object({
  version: z.number().int().positive(),
  rows: z
    .array(
      z.object({
        rif: z.string().trim().min(1).max(40),
        dates: z.record(z.string(), z.string().trim()),
      }),
    )
    .max(100),
});
const calendarMatrixSchema = z.object({
  version: z.number().int().positive(),
  label: z.string().trim().min(2).max(200),
  shortLabel: z.string().trim().min(2).max(100),
  cadence: z.string().trim().min(2).max(80),
  period: z.string().trim().min(2).max(250),
  note: z.string().trim().max(500).default(""),
  offeringIds: z.array(z.uuid()).min(1).max(50),
});

const catalogInclude = {
  taxRates: { orderBy: [{ effectiveFrom: "desc" }, { createdAt: "asc" }] },
  calendarMatrixLinks: {
    include: { matrix: { select: { groupKey: true } } },
    orderBy: { matrixId: "asc" },
  },
} satisfies Prisma.FirmOfferingInclude;

const calendarInclude = {
  matrices: {
    include: {
      offeringLinks: {
        include: { offering: { select: { id: true, name: true } } },
      },
      dates: { orderBy: [{ dueDate: "asc" }, { rifCriterion: "asc" }] },
    },
    orderBy: { ordinal: "asc" },
  },
} satisfies Prisma.FiscalCalendarInclude;

function assertFirmAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope)
    throw new AuthorizationError(
      "La configuración requiere acceso a toda la firma.",
    );
  requirePermission(auth, permission);
}

function isoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function serializeOffering(
  offering: Prisma.FirmOfferingGetPayload<{ include: typeof catalogInclude }>,
) {
  return {
    id: offering.id,
    version: offering.version,
    key: offering.key,
    kind: offering.kind,
    taxpayerCondition: offering.taxpayerCondition,
    name: offering.name,
    organism: offering.organism,
    frequency: offering.frequency,
    speFrequency: offering.speFrequency ?? "No aplica",
    speCalendarGroup: offering.calendarMatrixLinks[0]?.matrix.groupKey ?? "",
    deadline: {
      mode: offering.deadlineMode,
      dayCount: offering.deadlineDayCount,
      dayType: offering.deadlineDayType,
      base:
        offering.deadlineBase === "next-period-start"
          ? "period-start"
          : offering.deadlineBase,
    },
    evidenceRequirements: evidenceRequirementSchema
      .array()
      .catch([])
      .parse(offering.evidenceRequirements),
    template: offering.templateKey ?? "none",
    source: offering.source ?? "",
    appliesFrom: isoDate(offering.effectiveFrom),
    appliesTo: isoDate(offering.effectiveTo),
    active: offering.active,
    archiveOrder: offering.archiveOrder,
  };
}

function formatCalendarCell(date: Date, periodKey: string) {
  if (periodKey === "FECHA")
    return date.toLocaleDateString("es-VE", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return String(date.getUTCDate()).padStart(2, "0");
}

function rifTerminals(criterion: string) {
  return [...new Set(criterion.match(/\d/g) ?? [])].sort(
    (left, right) => Number(left) - Number(right),
  );
}

const monthlyCalendarColumns = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

function serializeCalendar(
  calendar: Prisma.FiscalCalendarGetPayload<{
    include: typeof calendarInclude;
  }>,
) {
  return {
    id: calendar.id,
    version: calendar.version,
    key: calendar.key,
    name: calendar.name,
    year: calendar.year,
    taxpayerCondition: calendar.taxpayerCondition,
    appliesFrom: isoDate(calendar.effectiveFrom),
    appliesTo: isoDate(calendar.effectiveTo),
    sourceGazette: calendar.sourceGazette ?? "",
    sourcePublishedAt: isoDate(calendar.sourcePublishedAt),
    sourceProvision: calendar.sourceProvision ?? "",
    sourceIssuedAt: isoDate(calendar.sourceIssuedAt),
    sourceNote: calendar.sourceNote ?? "",
    active: calendar.active,
    matrices: calendar.matrices.map((matrix) => {
      const columns = matrix.dates.length
        ? [...new Set(matrix.dates.map(({ periodKey }) => periodKey))]
        : monthlyCalendarColumns;
      const rifCriteria = matrix.dates.length
        ? [
            ...new Set(
              matrix.dates.flatMap(({ rifCriterion }) =>
                rifTerminals(rifCriterion),
              ),
            ),
          ].sort((left, right) => Number(left) - Number(right))
        : Array.from({ length: 10 }, (_, terminal) => String(terminal));
      return {
        id: matrix.id,
        key: matrix.key,
        groupId: matrix.groupKey,
        label: matrix.label,
        shortLabel: matrix.shortLabel,
        cadence: matrix.cadence,
        period: matrix.periodLabel,
        offeringIds: matrix.offeringLinks.map(({ offering }) => offering.id),
        obligations: matrix.offeringLinks.map(({ offering }) => offering.name),
        columns,
        rows: rifCriteria.map((rif) => ({
          rif,
          dates: Object.fromEntries(
            columns.map((column) => {
              const item = matrix.dates.find(
                (date) =>
                  date.periodKey === column &&
                  rifTerminals(date.rifCriterion).includes(rif),
              );
              return [
                column,
                item ? formatCalendarCell(item.dueDate, column) : "",
              ];
            }),
          ),
        })),
        ...(matrix.note ? { note: matrix.note } : {}),
      };
    }),
  };
}

export async function getFirmCatalog(auth: AuthContext) {
  assertFirmAccess(auth, permissions.firmSettingsRead);
  return withAuthTransaction(auth, async (transaction) => {
    const [offerings, calendars] = await Promise.all([
      transaction.firmOffering.findMany({
        where: { firmId: auth.firmId },
        include: catalogInclude,
        orderBy: [{ archiveOrder: "asc" }, { kind: "asc" }, { name: "asc" }],
      }),
      transaction.fiscalCalendar.findMany({
        where: { firmId: auth.firmId },
        include: calendarInclude,
        orderBy: { year: "desc" },
      }),
    ]);
    return {
      offerings: offerings.map(serializeOffering),
      taxRates: offerings.flatMap(({ taxRates, ...offering }) =>
        taxRates.map((rate) => ({
          id: rate.id,
          version: rate.version,
          offeringId: offering.id,
          name: rate.name,
          rate: rate.rate.toString().replace(".", ","),
          appliesFrom: isoDate(rate.effectiveFrom),
          appliesTo: isoDate(rate.effectiveTo),
          source: rate.source ?? "",
          active: rate.active,
        })),
      ),
      calendars: calendars.map(serializeCalendar),
      canManage: auth.permissionKeys.includes(permissions.firmSettingsUpdate),
      canReconcile: auth.permissionKeys.includes(permissions.calendarReconcile),
    };
  });
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function offeringData(input: z.infer<typeof offeringFields>) {
  if (
    input.active &&
    input.kind === "TAX" &&
    (!input.source || !input.appliesFrom)
  )
    throw new Error(
      "Un impuesto necesita fuente y vigencia antes de habilitarse.",
    );
  const needsOrdinaryRule =
    input.kind === "SERVICE" || input.taxpayerCondition !== "SPECIAL_TAXPAYER";
  const needsSpecialRule =
    input.kind === "TAX" && input.taxpayerCondition !== "ORDINARY";
  if (
    needsOrdinaryRule &&
    input.deadline.mode === "days" &&
    input.deadline.dayCount < 1
  )
    throw new Error("Configura el vencimiento antes de guardar.");
  if (
    needsSpecialRule &&
    (input.speFrequency === "No aplica" || !input.speCalendarGroup)
  )
    throw new Error(
      "Configura la periodicidad y la matriz para contribuyentes especiales.",
    );
  if (
    input.active &&
    input.kind === "TAX" &&
    !input.evidenceRequirements.length
  )
    throw new Error(
      "Habilita al menos un soporte para el expediente del impuesto.",
    );
  return {
    kind: input.kind,
    taxpayerCondition:
      input.kind === "SERVICE" ? ("ALL" as const) : input.taxpayerCondition,
    name: input.name,
    organism: input.organism,
    frequency: input.frequency,
    speFrequency:
      input.taxpayerCondition === "ORDINARY" ||
      input.speFrequency === "No aplica"
        ? null
        : input.speFrequency,
    deadlineMode: input.deadline.mode,
    deadlineDayCount: input.deadline.dayCount,
    deadlineDayType: input.deadline.dayType,
    deadlineBase: input.deadline.base,
    evidenceRequirements:
      input.kind === "TAX" ? input.evidenceRequirements : [],
    templateKey: input.template === "none" ? null : input.template,
    source: input.source || null,
    effectiveFrom: input.appliesFrom,
    effectiveTo: input.appliesTo,
    active: input.active,
    archiveOrder: input.archiveOrder,
  };
}

export async function createFirmOffering(auth: AuthContext, rawInput: unknown) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = createOfferingSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const baseKey = input.key ? slug(input.key) : slug(input.name);
    let key = baseKey;
    let suffix = 2;
    while (
      await transaction.firmOffering.findUnique({
        where: { firmId_key: { firmId: auth.firmId, key } },
        select: { id: true },
      })
    )
      key = `${baseKey}-${suffix++}`;
    const latestOffering = await transaction.firmOffering.findFirst({
      where: { firmId: auth.firmId, kind: input.kind },
      select: { archiveOrder: true },
      orderBy: { archiveOrder: "desc" },
    });
    const archiveBase = input.kind === "TAX" ? 0 : 5000;
    const archiveOrder = Math.min(
      9999,
      Math.max(archiveBase, latestOffering?.archiveOrder ?? archiveBase) + 10,
    );
    const offering = await transaction.firmOffering.create({
      data: {
        firmId: auth.firmId,
        key,
        ...offeringData(input),
        archiveOrder,
      },
      include: catalogInclude,
    });
    await syncOfferingCalendarGroup(
      transaction,
      auth.firmId,
      offering.id,
      input.taxpayerCondition === "ORDINARY" ? "" : input.speCalendarGroup,
    );
    await audit(transaction, auth, "firm.offering.created", offering.id, {
      key,
      kind: input.kind,
    });
    return serializeOffering(
      await transaction.firmOffering.findUniqueOrThrow({
        where: { id: offering.id },
        include: catalogInclude,
      }),
    );
  });
}

export async function saveFirmOfferingOrder(
  auth: AuthContext,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = archiveOrderSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const existing = await transaction.firmOffering.findMany({
      where: { firmId: auth.firmId, kind: input.kind },
      select: { id: true },
    });
    const existingIds = new Set(existing.map(({ id }) => id));
    if (
      existing.length !== input.orderedIds.length ||
      input.orderedIds.some((id) => !existingIds.has(id))
    )
      throw new Error(
        "El catálogo cambió mientras organizabas el archivo. Recarga e inténtalo nuevamente.",
      );

    const base = input.kind === "TAX" ? 0 : 5000;
    for (const [index, id] of input.orderedIds.entries()) {
      await transaction.firmOffering.updateMany({
        where: { id, firmId: auth.firmId, kind: input.kind },
        data: {
          archiveOrder: base + (index + 1) * 10,
          version: { increment: 1 },
        },
      });
    }
    await audit(
      transaction,
      auth,
      "firm.offering.archive_order.updated",
      auth.firmId,
      { kind: input.kind, orderedIds: input.orderedIds },
    );
    const offerings = await transaction.firmOffering.findMany({
      where: { firmId: auth.firmId, kind: input.kind },
      include: catalogInclude,
      orderBy: [{ archiveOrder: "asc" }, { name: "asc" }],
    });
    return offerings.map(serializeOffering);
  });
}

export async function updateFirmOffering(
  auth: AuthContext,
  offeringId: string,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = updateOfferingSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const result = await transaction.firmOffering.updateMany({
      where: { id: offeringId, firmId: auth.firmId, version: input.version },
      data: { ...offeringData(input), version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new Error(
        "El catálogo cambió en otra sesión. Recarga antes de guardar.",
      );
    await syncOfferingCalendarGroup(
      transaction,
      auth.firmId,
      offeringId,
      input.taxpayerCondition === "ORDINARY" ? "" : input.speCalendarGroup,
    );
    await audit(transaction, auth, "firm.offering.updated", offeringId, {
      version: input.version + 1,
    });
    return serializeOffering(
      await transaction.firmOffering.findUniqueOrThrow({
        where: { id: offeringId },
        include: catalogInclude,
      }),
    );
  });
}

async function syncOfferingCalendarGroup(
  transaction: Prisma.TransactionClient,
  firmId: string,
  offeringId: string,
  groupKey: string,
) {
  const currentLinks = await transaction.fiscalCalendarMatrixOffering.findMany({
    where: { offeringId },
    select: { matrix: { select: { groupKey: true } } },
  });
  if (
    groupKey &&
    currentLinks.some(({ matrix }) => matrix.groupKey === groupKey)
  )
    return;
  await transaction.fiscalCalendarMatrixOffering.deleteMany({
    where: { offeringId },
  });
  if (!groupKey) return;
  const matrices = await transaction.fiscalCalendarMatrix.findMany({
    where: { groupKey, calendar: { firmId } },
    select: { id: true },
  });
  if (!matrices.length)
    throw new Error("La matriz SPE seleccionada no pertenece a esta firma.");
  await transaction.fiscalCalendarMatrixOffering.createMany({
    data: matrices.map(({ id: matrixId }) => ({ matrixId, offeringId })),
  });
}

export async function deleteFirmOffering(
  auth: AuthContext,
  offeringId: string,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  return withAuthTransaction(auth, async (transaction) => {
    const offering = await transaction.firmOffering.findFirstOrThrow({
      where: { id: offeringId, firmId: auth.firmId },
      select: { id: true, key: true, kind: true },
    });
    const [companyUses, calendarUses, rateUses] = await Promise.all([
      transaction.companyOffering.count({
        where: {
          kind: offering.kind,
          offeringKey: offering.key,
          company: { firmId: auth.firmId },
        },
      }),
      transaction.fiscalCalendarMatrixOffering.count({ where: { offeringId } }),
      transaction.taxRate.count({ where: { offeringId } }),
    ]);
    if (companyUses || calendarUses || rateUses)
      throw new Error(
        "No se puede eliminar porque ya tiene empresas, calendarios o alícuotas vinculadas. Deshabilítalo para conservar la trazabilidad.",
      );
    await transaction.firmOffering.delete({ where: { id: offeringId } });
    await audit(transaction, auth, "firm.offering.deleted", offeringId, {
      key: offering.key,
    });
    return { id: offeringId, deleted: true };
  });
}

export async function saveTaxRates(auth: AuthContext, rawInput: unknown) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const { rates } = saveTaxRatesSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const validOfferings = await transaction.firmOffering.findMany({
      where: {
        firmId: auth.firmId,
        kind: "TAX",
        id: { in: rates.map(({ offeringId }) => offeringId) },
      },
      select: { id: true },
    });
    if (
      new Set(validOfferings.map(({ id }) => id)).size !==
      new Set(rates.map(({ offeringId }) => offeringId)).size
    )
      throw new Error(
        "La alícuota debe pertenecer a un impuesto de esta firma.",
      );
    for (const rate of rates) {
      if (rate.active && (!rate.source || !rate.appliesFrom))
        throw new Error(
          "Una alícuota necesita fuente y vigencia antes de habilitarse.",
        );
      const data = {
        offeringId: rate.offeringId,
        name: rate.name,
        rate: rate.rate,
        effectiveFrom: rate.appliesFrom,
        effectiveTo: rate.appliesTo,
        source: rate.source || null,
        active: rate.active,
      };
      if (rate.id) {
        const result = await transaction.taxRate.updateMany({
          where: { id: rate.id, firmId: auth.firmId, version: rate.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (result.count !== 1)
          throw new Error(
            "Las alícuotas cambiaron en otra sesión. Recarga antes de guardar.",
          );
      } else
        await transaction.taxRate.create({
          data: { firmId: auth.firmId, ...data },
        });
    }
    await audit(transaction, auth, "firm.tax_rates.updated", auth.firmId, {
      count: rates.length,
    });
    return getCatalogInside(transaction, auth.firmId);
  });
}

function parseCalendarDate(value: string, periodKey: string, year: number) {
  if (periodKey === "FECHA") {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match)
      throw new Error(`La fecha ${value} no tiene formato DD/MM/AAAA.`);
    return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`);
  }
  const months: Record<string, number> = {
    ENE: 1,
    FEB: 2,
    MAR: 3,
    ABR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AGO: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DIC: 12,
  };
  const month = months[periodKey];
  const day = Number(value);
  if (!month || !Number.isInteger(day) || day < 1 || day > 31)
    throw new Error(`La fecha de ${periodKey} no es válida.`);
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`,
  );
}

export async function saveFiscalCalendarMatrix(
  auth: AuthContext,
  calendarId: string,
  matrixId: string,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = calendarDatesSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const calendar = await transaction.fiscalCalendar.findFirstOrThrow({
      where: { id: calendarId, firmId: auth.firmId },
      select: { year: true, version: true },
    });
    if (calendar.version !== input.version)
      throw new Error(
        "El calendario cambió en otra sesión. Recarga antes de guardar.",
      );
    const matrix = await transaction.fiscalCalendarMatrix.findFirstOrThrow({
      where: { id: matrixId, calendarId },
      select: { id: true },
    });
    const dates = input.rows.flatMap((row) =>
      Object.entries(row.dates)
        .filter(([, value]) => value)
        .map(([periodKey, value]) => ({
          matrixId: matrix.id,
          rifCriterion: row.rif,
          periodKey,
          dueDate: parseCalendarDate(value, periodKey, calendar.year),
        })),
    );
    await transaction.fiscalCalendarDate.deleteMany({ where: { matrixId } });
    await transaction.fiscalCalendarDate.createMany({ data: dates });
    await transaction.fiscalCalendar.update({
      where: { id: calendarId },
      data: { version: { increment: 1 } },
    });
    await audit(
      transaction,
      auth,
      "firm.fiscal_calendar.matrix_updated",
      matrixId,
      { calendarId, dates: dates.length },
    );
    return serializeCalendar(
      await transaction.fiscalCalendar.findUniqueOrThrow({
        where: { id: calendarId },
        include: calendarInclude,
      }),
    );
  });
}

export async function updateFiscalCalendarMatrix(
  auth: AuthContext,
  calendarId: string,
  matrixId: string,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = calendarMatrixSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const calendar = await transaction.fiscalCalendar.findFirstOrThrow({
      where: { id: calendarId, firmId: auth.firmId },
      select: { version: true },
    });
    if (calendar.version !== input.version)
      throw new Error(
        "El calendario cambió en otra sesión. Recarga antes de guardar.",
      );
    await transaction.fiscalCalendarMatrix.findFirstOrThrow({
      where: { id: matrixId, calendarId },
      select: { id: true },
    });
    const uniqueOfferingIds = [...new Set(input.offeringIds)];
    const offerings = await transaction.firmOffering.findMany({
      where: {
        id: { in: uniqueOfferingIds },
        firmId: auth.firmId,
        kind: "TAX",
      },
      select: { id: true },
    });
    if (offerings.length !== uniqueOfferingIds.length)
      throw new Error(
        "Todos los impuestos seleccionados deben pertenecer a esta firma.",
      );
    await transaction.fiscalCalendarMatrix.update({
      where: { id: matrixId },
      data: {
        label: input.label,
        shortLabel: input.shortLabel,
        cadence: input.cadence,
        periodLabel: input.period,
        note: input.note || null,
      },
    });
    await transaction.fiscalCalendarMatrixOffering.deleteMany({
      where: { matrixId },
    });
    await transaction.fiscalCalendarMatrixOffering.createMany({
      data: uniqueOfferingIds.map((offeringId) => ({ matrixId, offeringId })),
    });
    await transaction.fiscalCalendar.update({
      where: { id: calendarId },
      data: { version: { increment: 1 } },
    });
    await audit(
      transaction,
      auth,
      "firm.fiscal_calendar.matrix_configured",
      matrixId,
      { calendarId, offeringIds: uniqueOfferingIds },
    );
    return serializeCalendar(
      await transaction.fiscalCalendar.findUniqueOrThrow({
        where: { id: calendarId },
        include: calendarInclude,
      }),
    );
  });
}

export async function createFiscalCalendarMatrix(
  auth: AuthContext,
  calendarId: string,
  rawInput: unknown,
) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = calendarMatrixSchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const calendar = await transaction.fiscalCalendar.findFirstOrThrow({
      where: { id: calendarId, firmId: auth.firmId },
      select: { version: true },
    });
    if (calendar.version !== input.version)
      throw new Error(
        "El calendario cambió en otra sesión. Recarga antes de guardar.",
      );

    const uniqueOfferingIds = [...new Set(input.offeringIds)];
    const offerings = await transaction.firmOffering.findMany({
      where: {
        id: { in: uniqueOfferingIds },
        firmId: auth.firmId,
        kind: "TAX",
      },
      select: { id: true },
    });
    if (offerings.length !== uniqueOfferingIds.length)
      throw new Error(
        "Todos los impuestos seleccionados deben pertenecer a esta firma.",
      );

    const baseKey =
      slug(input.shortLabel || input.label) || `matriz-${Date.now()}`;
    let key = baseKey;
    let suffix = 2;
    while (
      await transaction.fiscalCalendarMatrix.findUnique({
        where: { calendarId_key: { calendarId, key } },
        select: { id: true },
      })
    )
      key = `${baseKey}-${suffix++}`;
    const lastMatrix = await transaction.fiscalCalendarMatrix.findFirst({
      where: { calendarId },
      orderBy: { ordinal: "desc" },
      select: { ordinal: true },
    });
    const matrix = await transaction.fiscalCalendarMatrix.create({
      data: {
        calendarId,
        key,
        groupKey: key,
        label: input.label,
        shortLabel: input.shortLabel,
        cadence: input.cadence,
        periodLabel: input.period,
        note: input.note || null,
        ordinal: (lastMatrix?.ordinal ?? -1) + 1,
      },
      select: { id: true },
    });
    await transaction.fiscalCalendarMatrixOffering.createMany({
      data: uniqueOfferingIds.map((offeringId) => ({
        matrixId: matrix.id,
        offeringId,
      })),
    });
    await transaction.fiscalCalendar.update({
      where: { id: calendarId },
      data: { version: { increment: 1 } },
    });
    await audit(
      transaction,
      auth,
      "firm.fiscal_calendar.matrix_created",
      matrix.id,
      {
        calendarId,
        offeringIds: uniqueOfferingIds,
      },
    );
    return {
      matrixId: matrix.id,
      calendar: serializeCalendar(
        await transaction.fiscalCalendar.findUniqueOrThrow({
          where: { id: calendarId },
          include: calendarInclude,
        }),
      ),
    };
  });
}

async function getCatalogInside(
  transaction: Prisma.TransactionClient,
  firmId: string,
) {
  const offerings = await transaction.firmOffering.findMany({
    where: { firmId },
    include: catalogInclude,
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });
  return {
    offerings: offerings.map(serializeOffering),
    taxRates: offerings.flatMap(({ taxRates, ...offering }) =>
      taxRates.map((rate) => ({
        id: rate.id,
        version: rate.version,
        offeringId: offering.id,
        name: rate.name,
        rate: rate.rate.toString().replace(".", ","),
        appliesFrom: isoDate(rate.effectiveFrom),
        appliesTo: isoDate(rate.effectiveTo),
        source: rate.source ?? "",
        active: rate.active,
      })),
    ),
  };
}

function audit(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  eventType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue,
) {
  return transaction.auditEvent.create({
    data: {
      firmId: auth.firmId,
      actorUserId: auth.userId,
      requestId: randomUUID(),
      eventType,
      entityType: "firm_catalog",
      entityId,
      metadata,
    },
  });
}
