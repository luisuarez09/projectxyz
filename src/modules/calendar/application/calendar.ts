import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { evidenceLabel } from "@/lib/evidence-requirements";
import { addDeadlineDays } from "@/lib/deadline-rules";
import {
  deletePrivateObject,
  privateBucket,
  putPrivateObject,
} from "@/infrastructure/object-storage/s3-private-storage";
import {
  AuthorizationError,
  requirePermission,
} from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";
import type {
  AnnualStatusKind,
  AnnualStatusOverview,
} from "@/modules/calendar/domain/calendar";
import { summarizeAnnualMonth } from "@/modules/calendar/domain/annual-status";

const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El período debe usar el formato AAAA-MM.");
const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "La fecha no es válida.");
const updateCaseSchema = z.object({
  version: z.number().int().positive(),
  status: z.enum([
    "PENDING",
    "PREPARING",
    "READY_FOR_REVIEW",
    "SUBMITTED",
    "PAID",
    "CLOSED",
    "INCIDENT",
    "NOT_APPLICABLE",
  ]),
  activityMode: z
    .enum(["WITH_ACTIVITY", "WITHOUT_ACTIVITY"])
    .nullable(),
  filedAt: optionalDate,
  paidAt: optionalDate.optional(),
  amount: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\d+(?:[.,]\d{1,6})?$/.test(value),
      "El monto no es válido.",
    ),
});
const resetCaseSchema = z.object({ version: z.number().int().positive() });
const evidenceKindSchema = z.enum([
  "SOLVENCY",
  "DECLARATION_RECEIPT",
  "DECLARATION_FILE",
  "PAYMENT_FORM",
  "PAYMENT_RECEIPT",
  "INVOICE",
  "OTHER",
]);
const evidenceRequirementSchema = z.object({
  kind: z.enum([
    "SOLVENCY",
    "DECLARATION_RECEIPT",
    "DECLARATION_FILE",
    "PAYMENT_FORM",
    "PAYMENT_RECEIPT",
  ]),
  required: z.boolean(),
  fiscalBoard: z.boolean().default(false),
});
const evidenceRequirementsSchema = evidenceRequirementSchema.array().catch([]);
const reconciliationSchema = z.object({
  action: z.enum(["preview", "apply"]),
  periodFrom: periodSchema,
  periodTo: periodSchema,
  companyId: z.uuid().optional(),
});
const calendarViewSchema = z.enum(["due", "period"]);
const annualStatusKindSchema = z.enum(["TAX", "SERVICE"]);
const annualStatusYearSchema = z.coerce
  .number()
  .int()
  .min(2000, "El a\u00f1o no es v\u00e1lido.")
  .max(2100, "El a\u00f1o no es v\u00e1lido.");

const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const monthKeys = [
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

type ExpectedPeriod = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  half?: 1 | 2;
};

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function utcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function caracasToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return new Date(`${parts.find(({ type }) => type === "year")?.value}-${parts.find(({ type }) => type === "month")?.value}-${parts.find(({ type }) => type === "day")?.value}T00:00:00.000Z`);
}

function monthBounds(period: string) {
  const [year, month] = periodSchema.parse(period).split("-").map(Number);
  return {
    year,
    monthIndex: month - 1,
    start: utcDate(year, month - 1, 1),
    end: utcDate(year, month, 0),
  };
}

function shiftMonth(period: string, amount: number) {
  const { year, monthIndex } = monthBounds(period);
  const shifted = utcDate(year, monthIndex + amount, 1);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodView(period: string) {
  const { year, monthIndex } = monthBounds(period);
  return {
    key: period,
    label: `${monthNames[monthIndex]} ${year}`,
    previous: shiftMonth(period, -1),
    next: shiftMonth(period, 1),
  };
}

function expectedPeriods(period: string, cadence: string): ExpectedPeriod[] {
  const { year, monthIndex, start, end } = monthBounds(period);
  const normalized = cadence.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("quincenal"))
    return [
      {
        key: `${period}-Q1`,
        label: `1ra quincena · ${monthNames[monthIndex]} ${year}`,
        start,
        end: utcDate(year, monthIndex, 15),
        half: 1,
      },
      {
        key: `${period}-Q2`,
        label: `2da quincena · ${monthNames[monthIndex]} ${year}`,
        start: utcDate(year, monthIndex, 16),
        end,
        half: 2,
      },
    ];
  if (normalized.includes("trimestral")) {
    if ((monthIndex + 1) % 3 !== 0) return [];
    const quarter = Math.floor(monthIndex / 3) + 1;
    return [{
      key: `${year}-T${quarter}`,
      label: `${quarter}.º trimestre ${year}`,
      start: utcDate(year, monthIndex - 2, 1),
      end,
    }];
  }
  if (normalized.includes("anual")) {
    if (monthIndex !== 11) return [];
    return [{
      key: String(year),
      label: `Ejercicio ${year}`,
      start: utcDate(year, 0, 1),
      end,
    }];
  }
  return [{
    key: period,
    label: `${monthNames[monthIndex]} ${year}`,
    start,
    end,
  }];
}

function appliesToCompany(
  condition: "SPECIAL_TAXPAYER" | "ORDINARY" | "ALL",
  taxpayerType: string | null,
) {
  if (condition === "ALL") return true;
  const special = (taxpayerType ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("especial");
  return condition === "SPECIAL_TAXPAYER" ? special : !special;
}

function rifTerminal(normalizedRif: string) {
  return [...normalizedRif].reverse().find((character) => /\d/.test(character)) ?? "";
}

function criterionMatches(criterion: string, terminal: string) {
  return (criterion.match(/\d/g) ?? ([] as string[])).includes(terminal);
}

function deadlineBasis(offering: {
  deadlineMode: string;
  deadlineDayCount: number;
  deadlineDayType: string;
  deadlineBase: string;
}, special: boolean) {
  if (special)
    return "Calendario anual configurado · terminal del RIF";
  if (offering.deadlineMode === "document-date")
    return "Fecha indicada en factura o documento";
  const type = offering.deadlineDayType === "business" ? "hábiles" : "continuos";
  const base = offering.deadlineBase === "period-end"
    ? "cierre del período"
    : offering.deadlineBase === "document-date"
      ? "fecha del documento"
      : "inicio del período";
  return `${offering.deadlineDayCount} días ${type} · ${base}`;
}

function ordinaryDueDate(
  offering: {
    deadlineMode: string;
    deadlineDayCount: number;
    deadlineDayType: string;
    deadlineBase: string;
  },
  expected: ExpectedPeriod,
) {
  if (offering.deadlineMode !== "days") return null;
  if (offering.deadlineBase === "document-date") return null;
  if (offering.deadlineBase === "period-end")
    return addDeadlineDays(
      expected.end,
      offering.deadlineDayCount,
      offering.deadlineDayType === "business" ? "business" : "calendar",
    );
  return addDeadlineDays(
    expected.start,
    offering.deadlineDayCount,
    offering.deadlineDayType === "business" ? "business" : "calendar",
    true,
  );
}

function officialDueDate(
  offering: Prisma.FirmOfferingGetPayload<{
    include: {
      calendarMatrixLinks: {
        include: {
          matrix: {
            include: { dates: true; calendar: true };
          };
        };
      };
    };
  }>,
  terminal: string,
  expected: ExpectedPeriod,
) {
  if (!terminal) return null;
  const links = offering.calendarMatrixLinks.filter(({ matrix }) => matrix.calendar.active);
  const link = expected.half
    ? links.find(({ matrix }) =>
        matrix.shortLabel.toLowerCase().includes(expected.half === 1 ? "1ra" : "2da"),
      )
    : links[0];
  if (!link) return null;
  const dueMonth = expected.half === 2
    ? (expected.end.getUTCMonth() + 1) % 12
    : expected.end.getUTCMonth();
  return link.matrix.dates.find(
    ({ periodKey, rifCriterion }) =>
      periodKey === monthKeys[dueMonth] && criterionMatches(rifCriterion, terminal),
  )?.dueDate ?? null;
}

function deadlineStatus(status: string, dueDate: Date | null) {
  if (["SUBMITTED", "PAID", "CLOSED", "NOT_APPLICABLE"].includes(status))
    return "ON_TRACK" as const;
  if (!dueDate) return "NO_DUE_DATE" as const;
  const todayUtc = caracasToday();
  if (dueDate < todayUtc) return "OVERDUE" as const;
  const sevenDays = utcDate(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() + 7);
  return dueDate <= sevenDays ? "DUE_SOON" as const : "ON_TRACK" as const;
}

const caseInclude = {
  offering: { select: { key: true } },
  company: {
    select: {
      legalName: true,
      activity: true,
      responsibleProfile: { select: { displayName: true } },
    },
  },
  assignedProfile: { select: { displayName: true } },
  evidences: {
    include: {
      storedObject: {
        select: { originalName: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ComplianceCaseInclude;

function serializeCase(
  item: Prisma.ComplianceCaseGetPayload<{ include: typeof caseInclude }>,
) {
  return {
    id: item.id,
    version: item.version,
    companyId: item.companyId,
    companyName: item.company.legalName,
    business: item.company.activity ?? "Actividad sin especificar",
    owner: item.assignedProfile?.displayName ?? item.company.responsibleProfile?.displayName ?? "Sin responsable",
    offeringId: item.offeringId,
    offeringKey: item.offering.key,
    offeringName: item.offeringName,
    offeringKind: item.offeringKind,
    organism: item.organism,
    periodKey: item.periodKey,
    periodLabel: item.periodLabel,
    cadence: item.cadence,
    regime: item.regime,
    deadlineBasis: item.deadlineBasis,
    dueDate: dateOnly(item.dueDate),
    status: item.status,
    deadlineStatus: deadlineStatus(item.status, item.dueDate),
    activityMode: item.activityMode,
    filedAt: dateOnly(item.filedAt),
    paidAt: dateOnly(item.paidAt),
    amount: item.amount?.toString() ?? "",
    evidenceRequirements: evidenceRequirementsSchema.parse(item.evidenceRequirements),
    evidences: item.evidences.map((evidence) => ({
      id: evidence.id,
      kind: evidence.kind,
      originalName: evidence.storedObject.originalName,
      status: evidence.storedObject.status,
    })),
  };
}

function sameDate(left: Date | string | null | undefined, right: Date | null) {
  const leftDate = left ? new Date(left).toISOString().slice(0, 10) : "";
  const rightDate = right ? right.toISOString().slice(0, 10) : "";
  return leftDate === rightDate;
}

async function buildPeriodProjection(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  period: string,
  companyId?: string,
) {
  const { start: periodMonth, end: monthEnd } = monthBounds(period);
  const companies = await transaction.company.findMany({
    where: {
      status: "ACTIVE",
      ...(companyId ? { id: companyId } : {}),
    },
    select: {
      id: true,
      legalName: true,
      activity: true,
      normalizedRif: true,
      taxpayerType: true,
      responsibleProfileId: true,
      responsibleProfile: { select: { displayName: true } },
      offerings: true,
    },
    orderBy: { legalName: "asc" },
  });
  if (companyId && !companies.length)
    throw new AuthorizationError("La empresa seleccionada no está disponible.");
  const offerings = await transaction.firmOffering.findMany({
    where: {
      firmId: auth.firmId,
      active: true,
      OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: monthEnd } }],
      AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodMonth } }] }],
    },
    include: {
      calendarMatrixLinks: {
        include: { matrix: { include: { dates: true, calendar: true } } },
      },
    },
  });
  const offeringByKey = new Map(
    offerings.map((offering) => [`${offering.kind}:${offering.key}`, offering]),
  );
  const rows: Prisma.ComplianceCaseCreateManyInput[] = [];
  for (const company of companies) {
    for (const enrollment of company.offerings) {
      const offering = offeringByKey.get(`${enrollment.kind}:${enrollment.offeringKey}`);
      if (!offering || !appliesToCompany(offering.taxpayerCondition, company.taxpayerType)) continue;
      const special = (company.taxpayerType ?? "").toLowerCase().includes("especial");
      const useSpecialRule = offering.kind === "TAX" && special;
      const cadence = useSpecialRule && offering.speFrequency
        ? offering.speFrequency
        : offering.frequency;
      const regime = useSpecialRule ? "SPE" : "General";
      for (const expected of expectedPeriods(period, cadence)) {
        const dueDate = useSpecialRule
          ? officialDueDate(offering, rifTerminal(company.normalizedRif), expected)
          : ordinaryDueDate(offering, expected);
        rows.push({
          firmId: auth.firmId,
          companyId: company.id,
          offeringId: offering.id,
          assignedProfileId: company.responsibleProfileId,
          periodKey: expected.key,
          periodLabel: expected.label,
          periodMonth,
          periodStart: expected.start,
          periodEnd: expected.end,
          dueDate,
          offeringName: offering.name,
          offeringKind: offering.kind,
          organism: offering.organism,
          cadence,
          regime,
          deadlineBasis: deadlineBasis(offering, useSpecialRule),
          ruleVersion: offering.version,
          sourceSnapshot: offering.source,
          evidenceRequirements: evidenceRequirementsSchema.parse(
            offering.evidenceRequirements,
          ),
        });
      }
    }
  }
  return { companies, periodMonth, rows };
}

async function ensurePeriodCases(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  period: string,
  companyId?: string,
) {
  const { companies, rows } = await buildPeriodProjection(
    transaction,
    auth,
    period,
    companyId,
  );
  if (rows.length)
    await transaction.complianceCase.createMany({ data: rows, skipDuplicates: true });
  return companies;
}

const protectedCalendarStatuses = new Set(["SUBMITTED", "PAID", "CLOSED"]);

function periodsBetween(from: string, to: string) {
  if (from > to) throw new Error("El período inicial no puede ser posterior al período final.");
  const periods: string[] = [];
  for (let period = from; period <= to; period = shiftMonth(period, 1)) {
    periods.push(period);
    if (periods.length > 12)
      throw new Error("La conciliación admite un máximo de 12 meses por ejecución.");
  }
  return periods;
}

function projectionChanged(
  existing: {
    dueDate: Date | null;
    ruleVersion: number;
    deadlineBasis: string;
    sourceSnapshot: string | null;
    evidenceRequirements: Prisma.JsonValue;
    offeringName: string;
    organism: string;
    cadence: string;
    regime: string;
  },
  row: Prisma.ComplianceCaseCreateManyInput,
) {
  return (
    existing.ruleVersion !== row.ruleVersion ||
    !sameDate(row.dueDate, existing.dueDate) ||
    existing.deadlineBasis !== row.deadlineBasis ||
    existing.sourceSnapshot !== (typeof row.sourceSnapshot === "string" ? row.sourceSnapshot : null) ||
    existing.offeringName !== row.offeringName ||
    existing.organism !== row.organism ||
    existing.cadence !== row.cadence ||
    existing.regime !== row.regime ||
    JSON.stringify(existing.evidenceRequirements) !== JSON.stringify(row.evidenceRequirements)
  );
}

function projectedCaseData(row: Prisma.ComplianceCaseCreateManyInput) {
  return {
    assignedProfileId: row.assignedProfileId,
    periodLabel: row.periodLabel,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    dueDate: row.dueDate,
    offeringName: row.offeringName,
    offeringKind: row.offeringKind,
    organism: row.organism,
    cadence: row.cadence,
    regime: row.regime,
    deadlineBasis: row.deadlineBasis,
    ruleVersion: row.ruleVersion,
    sourceSnapshot: row.sourceSnapshot,
    evidenceRequirements: row.evidenceRequirements,
  };
}

export async function reconcileCalendar(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.calendarReconcile);
  if (!auth.firmScope)
    throw new AuthorizationError("La conciliación del calendario requiere el contexto administrativo de la firma.");
  const input = reconciliationSchema.parse(rawInput);
  const periods = periodsBetween(input.periodFrom, input.periodTo);

  return withAuthTransaction(auth, async (transaction) => {
    const items: Array<{
      caseId?: string;
      companyId: string;
      companyName: string;
      offeringName: string;
      period: string;
      action: "CREATE" | "RECALCULATE" | "SUPPRESS" | "RESTORE" | "PROTECTED" | "REVIEW";
      reason: string;
    }> = [];

    for (const period of periods) {
      const { companies, periodMonth, rows } = await buildPeriodProjection(
        transaction,
        auth,
        period,
        input.companyId,
      );
      const existingCases = await transaction.complianceCase.findMany({
        where: {
          firmId: auth.firmId,
          periodMonth,
          ...(input.companyId ? { companyId: input.companyId } : {}),
        },
        include: {
          company: { select: { legalName: true } },
          _count: { select: { evidences: true } },
        },
      });
      const expectedByKey = new Map(
        rows.map((row) => [`${row.companyId}:${row.offeringId}:${row.periodKey}`, row]),
      );
      const existingByKey = new Map(
        existingCases.map((item) => [
          `${item.companyId}:${item.offeringId}:${item.periodKey}`,
          item,
        ]),
      );

      for (const row of rows) {
        const key = `${row.companyId}:${row.offeringId}:${row.periodKey}`;
        const existing = existingByKey.get(key);
        const companyName = existing?.company.legalName ??
          companies.find(({ id }) => id === row.companyId)?.legalName ??
          "Empresa";
        if (!existing) {
          items.push({
            companyId: row.companyId,
            companyName,
            offeringName: row.offeringName,
            period,
            action: "CREATE",
            reason: "La obligación aplica, pero todavía no existe en el calendario.",
          });
          if (input.action === "apply")
            await transaction.complianceCase.create({ data: row });
          continue;
        }

        const pristine =
          existing.status === "PENDING" &&
          !existing.filedAt &&
          !existing.paidAt &&
          !existing.activityMode &&
          existing.amount === null &&
          existing._count.evidences === 0;
        const changed = projectionChanged(existing, row);
        if (!existing.suppressedAt && !changed) continue;
        let action: (typeof items)[number]["action"];
        let reason: string;
        if (protectedCalendarStatuses.has(existing.status)) {
          action = "PROTECTED";
          reason = "La obligación está declarada, pagada o cerrada y se conserva como evidencia histórica.";
        } else if (!pristine) {
          action = "REVIEW";
          reason = "La obligación tiene trabajo iniciado y requiere revisión manual antes de modificarla.";
        } else if (existing.suppressedAt) {
          action = "RESTORE";
          reason = "La obligación vuelve a aplicar según la configuración vigente.";
        } else {
          action = "RECALCULATE";
          reason = "La regla, fecha o soporte esperado cambió para una obligación pendiente.";
        }
        items.push({
          caseId: existing.id,
          companyId: existing.companyId,
          companyName,
          offeringName: row.offeringName,
          period,
          action,
          reason,
        });
        if (input.action === "apply" && (action === "RESTORE" || action === "RECALCULATE"))
          await transaction.complianceCase.update({
            where: { id: existing.id },
            data: {
              ...projectedCaseData(row),
              suppressedAt: null,
              suppressionReason: null,
              version: { increment: 1 },
            },
          });
      }

      for (const existing of existingCases) {
        const key = `${existing.companyId}:${existing.offeringId}:${existing.periodKey}`;
        if (expectedByKey.has(key) || existing.suppressedAt) continue;
        const pristine =
          existing.status === "PENDING" &&
          !existing.filedAt &&
          !existing.paidAt &&
          !existing.activityMode &&
          existing.amount === null &&
          existing._count.evidences === 0;
        const action = protectedCalendarStatuses.has(existing.status)
          ? "PROTECTED"
          : pristine
            ? "SUPPRESS"
            : "REVIEW";
        const reason = action === "SUPPRESS"
          ? "La obligación dejó de aplicar por la configuración vigente de la firma o la empresa."
          : action === "PROTECTED"
            ? "La obligación ya fue declarada, pagada o cerrada y se conserva como evidencia histórica."
            : "La obligación dejó de aplicar, pero tiene trabajo iniciado y requiere revisión manual.";
        items.push({
          caseId: existing.id,
          companyId: existing.companyId,
          companyName: existing.company.legalName,
          offeringName: existing.offeringName,
          period,
          action,
          reason,
        });
        if (input.action === "apply" && action === "SUPPRESS")
          await transaction.complianceCase.update({
            where: { id: existing.id },
            data: {
              suppressedAt: new Date(),
              suppressionReason: reason,
              version: { increment: 1 },
            },
          });
      }
    }

    const summary = Object.fromEntries(
      ["CREATE", "RECALCULATE", "SUPPRESS", "RESTORE", "PROTECTED", "REVIEW"].map(
        (action) => [action.toLowerCase(), items.filter((item) => item.action === action).length],
      ),
    );
    if (input.action === "apply")
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "calendar.reconciliation.applied",
          entityType: "compliance_case",
          metadata: { ...input, summary, affectedCaseIds: items.flatMap((item) => item.caseId ? [item.caseId] : []) },
        },
      });
    return { applied: input.action === "apply", scope: input, summary, items };
  });
}

export async function getCalendarPeriod(
  auth: AuthContext,
  rawPeriod: string,
  rawCompanyId?: string,
  rawView: string = "due",
) {
  requirePermission(auth, permissions.calendarRead);
  const period = periodSchema.parse(rawPeriod);
  const companyId = rawCompanyId && rawCompanyId !== "all"
    ? z.uuid().parse(rawCompanyId)
    : undefined;
  const viewMode = calendarViewSchema.parse(rawView);
  return withAuthTransaction(auth, async (transaction) => {
    const companies = await ensurePeriodCases(transaction, auth, period);
    if (companyId && !companies.some(({ id }) => id === companyId))
      throw new AuthorizationError("La empresa seleccionada no está disponible.");
    if (viewMode === "due")
      for (let offset = 1; offset <= 18; offset += 1)
        await ensurePeriodCases(transaction, auth, shiftMonth(period, -offset));
    const { start: periodMonth, end: periodEnd } = monthBounds(period);
    const cases = await transaction.complianceCase.findMany({
      where: {
        firmId: auth.firmId,
        suppressedAt: null,
        ...(companyId ? { companyId } : {}),
        ...(viewMode === "period"
          ? { periodMonth }
          : {
              OR: [
                { dueDate: { gte: periodMonth, lte: periodEnd } },
                { dueDate: null, periodMonth },
              ],
            }),
      },
      include: caseInclude,
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { company: { legalName: "asc" } },
        { offeringName: "asc" },
      ],
    });
    return {
      viewMode,
      period: periodView(period),
      companies: companies.map((company) => ({
        id: company.id,
        legalName: company.legalName,
        activity: company.activity ?? "Actividad sin especificar",
        responsibleName: company.responsibleProfile?.displayName ?? "Sin responsable",
      })),
      cases: cases.map(serializeCase),
      canManage: auth.permissionKeys.includes(permissions.calendarManage),
      canReset:
        auth.firmScope &&
        auth.permissionKeys.includes(permissions.calendarReset),
    };
  });
}

export async function getPaymentCommitments(auth: AuthContext) {
  requirePermission(auth, permissions.calendarRead);
  if (!auth.activeCompanyId)
    throw new AuthorizationError("Selecciona una empresa para consultar sus compromisos de pago.");
  const companyId = auth.activeCompanyId;

  return withAuthTransaction(auth, async (transaction) => {
    const today = caracasToday();
    const currentPeriod = today.toISOString().slice(0, 7);
    await ensurePeriodCases(transaction, auth, currentPeriod);

    const company = await transaction.company.findFirstOrThrow({
      where: { id: companyId, firmId: auth.firmId },
      select: { id: true, legalName: true, rif: true },
    });
    const cases = await transaction.complianceCase.findMany({
      where: {
        firmId: auth.firmId,
        companyId,
        suppressedAt: null,
        amount: { not: null },
        status: { not: "NOT_APPLICABLE" },
      },
      include: caseInclude,
      orderBy: [
        { paidAt: { sort: "asc", nulls: "first" } },
        { dueDate: { sort: "asc", nulls: "last" } },
        { periodMonth: "desc" },
      ],
    });

    return {
      company,
      cases: cases.map(serializeCase),
      canManage: auth.permissionKeys.includes(permissions.calendarManage),
    };
  });
}

function annualStatusHref(kind: AnnualStatusKind, templateKey: string | null) {
  if (kind === "SERVICE") return "/servicios";
  return templateKey ? `/declaraciones/${templateKey}` : "/declaraciones";
}

export async function getAnnualStatusOverview(
  auth: AuthContext,
  rawYear: unknown,
  rawKind: unknown,
): Promise<AnnualStatusOverview> {
  requirePermission(auth, permissions.calendarRead);
  const year = annualStatusYearSchema.parse(rawYear);
  const kind = annualStatusKindSchema.parse(rawKind);
  const companyId = auth.activeCompanyId;
  if (!companyId)
    throw new AuthorizationError("Selecciona una empresa activa para consultar su estatus anual.");

  return withAuthTransaction(auth, async (transaction) => {
    const company = await transaction.company.findFirst({
      where: { id: companyId, status: "ACTIVE" },
      select: {
        id: true,
        legalName: true,
        offerings: {
          where: { kind },
          select: { offeringKey: true },
        },
      },
    });
    if (!company)
      throw new AuthorizationError("La empresa activa no est\u00e1 disponible.");

    for (let month = 1; month <= 12; month += 1)
      await ensurePeriodCases(
        transaction,
        auth,
        `${year}-${String(month).padStart(2, "0")}`,
        companyId,
      );

    const enrolledOfferingKeys = company.offerings.map(({ offeringKey }) => offeringKey);
    const cases = enrolledOfferingKeys.length
      ? await transaction.complianceCase.findMany({
      where: {
        firmId: auth.firmId,
        companyId,
        offeringKind: kind,
        offering: { key: { in: enrolledOfferingKeys } },
        suppressedAt: null,
        periodMonth: {
          gte: utcDate(year, 0, 1),
          lte: utcDate(year, 11, 31),
        },
      },
      include: { offering: { select: { templateKey: true } } },
      orderBy: [{ offeringName: "asc" }, { periodMonth: "asc" }],
    })
      : [];

    const byOffering = new Map<string, typeof cases>();
    for (const item of cases) {
      const current = byOffering.get(item.offeringId) ?? [];
      current.push(item);
      byOffering.set(item.offeringId, current);
    }
    const rows = [...byOffering.values()].map((items) => {
      const first = items[0];
      const statuses = Array.from({ length: 12 }, (_, monthIndex) =>
        summarizeAnnualMonth(
          items.filter((item) => item.periodMonth.getUTCMonth() === monthIndex),
          utcDate(year, monthIndex, 1),
          caracasToday(),
        ),
      );
      return {
        offeringId: first.offeringId,
        name: first.offeringName,
        organism: first.organism,
        cadence: first.cadence,
        deadlineBasis: first.deadlineBasis,
        href: annualStatusHref(kind, first.offering.templateKey),
        statuses,
      };
    });
    const statuses = rows.flatMap((row) => row.statuses);

    return {
      year,
      kind,
      company: { id: company.id, legalName: company.legalName },
      rows,
      summary: {
        completed: statuses.filter((status) => status === "COMPLETED").length,
        pending: statuses.filter((status) => status === "PENDING").length,
        registered: statuses.filter((status) => status === "REGISTERED").length,
      },
    };
  });
}

export async function resetCalendarCase(
  auth: AuthContext,
  caseId: string,
  rawInput: unknown,
) {
  requirePermission(auth, permissions.calendarReset);
  if (!auth.firmScope)
    throw new AuthorizationError("Restablecer un expediente requiere el contexto administrativo de la firma.");
  z.uuid().parse(caseId);
  const input = resetCaseSchema.parse(rawInput);

  const result = await withAuthTransaction(auth, async (transaction) => {
    const existing = await transaction.complianceCase.findFirstOrThrow({
      where: { id: caseId, firmId: auth.firmId },
      include: {
        evidences: { include: { storedObject: true } },
        ivaDeclaration: {
          include: {
            documents: { select: { documentId: true, kind: true } },
          },
        },
      },
    });
    if (!auth.allowedCompanyIds.includes(existing.companyId))
      throw new AuthorizationError("No tienes acceso a este expediente.");
    if (existing.version !== input.version)
      throw new Error("El expediente cambió en otra sesión. Recarga antes de restablecerlo.");

    const objects = existing.evidences.map(({ kind, storedObject }) => ({
      id: storedObject.id,
      key: storedObject.objectKey,
      kind,
      originalName: storedObject.originalName,
      checksumSha256: storedObject.checksumSha256,
    }));
    await transaction.complianceCaseEvidence.deleteMany({ where: { caseId } });
    if (objects.length)
      await transaction.storedObject.updateMany({
        where: { id: { in: objects.map(({ id }) => id) } },
        data: { status: "ARCHIVED" },
      });
    if (existing.ivaDeclaration) {
      const saleIds = existing.ivaDeclaration.documents
        .filter(({ kind }) => kind === "SALE")
        .map(({ documentId }) => documentId);
      const purchaseIds = existing.ivaDeclaration.documents
        .filter(({ kind }) => kind === "PURCHASE")
        .map(({ documentId }) => documentId);
      if (saleIds.length)
        await transaction.commercialDocument.updateMany({
          where: { id: { in: saleIds }, companyId: existing.companyId },
          data: { declaredAt: null },
        });
      if (purchaseIds.length)
        await transaction.commercialDocument.updateMany({
          where: { id: { in: purchaseIds }, companyId: existing.companyId },
          data: { declaredAt: null, vatCreditStatus: "PENDING" },
        });
      await transaction.ivaDeclarationDocument.deleteMany({
        where: { declarationId: existing.ivaDeclaration.id },
      });
      await transaction.ivaDeclarationRetention.deleteMany({
        where: { declarationId: existing.ivaDeclaration.id },
      });
      await transaction.ivaFiscalBook.deleteMany({
        where: { declarationId: existing.ivaDeclaration.id },
      });
      await transaction.ivaDeclaration.update({
        where: { id: existing.ivaDeclaration.id },
        data: {
          salesTaxableBase: 0,
          salesExemptAmount: 0,
          debitTax: 0,
          purchaseTaxCredit: 0,
          deductibleTaxCredit: 0,
          currentRetentionCredit: 0,
          prorationFactor: null,
          taxPayable: 0,
          fiscalCreditCarryforward: 0,
          retentionCreditCarryforward: 0,
          determinedAt: null,
          version: { increment: 1 },
        },
      });
    }
    const updated = await transaction.complianceCase.update({
      where: { id: caseId },
      data: {
        status: "PENDING",
        activityMode: null,
        filedAt: null,
        paidAt: null,
        amount: null,
        version: { increment: 1 },
      },
      include: caseInclude,
    });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "calendar.case.reset",
        entityType: "compliance_case",
        entityId: caseId,
        metadata: {
          previousStatus: existing.status,
          removedEvidence: objects.map(({ id, kind, originalName, checksumSha256 }) => ({
            id,
            kind,
            originalName,
            checksumSha256,
          })),
        },
      },
    });
    return { case: serializeCase(updated), objects };
  });

  const cleanup = await Promise.allSettled(
    result.objects.map(({ key }) => deletePrivateObject(key)),
  );
  const cleanupPending = cleanup.filter(({ status }) => status === "rejected").length;
  if (cleanupPending)
    await withAuthTransaction(auth, (transaction) =>
      transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "calendar.case.reset_storage_cleanup_pending",
          entityType: "compliance_case",
          entityId: caseId,
          metadata: { cleanupPending },
        },
      }),
    );
  return { case: result.case, cleanupPending };
}

export async function updateCalendarCase(
  auth: AuthContext,
  caseId: string,
  rawInput: unknown,
) {
  requirePermission(auth, permissions.calendarManage);
  z.uuid().parse(caseId);
  const input = updateCaseSchema.parse(rawInput);
  if (["SUBMITTED", "CLOSED"].includes(input.status) && !input.filedAt)
    throw new Error("Indica la fecha declarada antes de cambiar el estado.");
  return withAuthTransaction(auth, async (transaction) => {
    const existing = await transaction.complianceCase.findFirstOrThrow({
      where: { id: caseId, firmId: auth.firmId },
      select: {
        companyId: true,
        paidAt: true,
        offeringKind: true,
        evidenceRequirements: true,
        evidences: { select: { kind: true } },
      },
    });
    if (!auth.allowedCompanyIds.includes(existing.companyId))
      throw new AuthorizationError("No tienes acceso a este expediente.");
    const evidenceKinds = new Set(existing.evidences.map(({ kind }) => kind));
    if (existing.offeringKind === "TAX") {
      const configured = evidenceRequirementsSchema.parse(existing.evidenceRequirements);
      const required = configured.filter(({ required, kind }) => {
        if (!required) return false;
        const paymentEvidence = kind === "PAYMENT_FORM" || kind === "PAYMENT_RECEIPT";
        return ["PAID", "CLOSED"].includes(input.status)
          ? true
          : input.status === "SUBMITTED" && !paymentEvidence;
      });
      const missing = required.filter(({ kind }) => !evidenceKinds.has(kind));
      if (missing.length)
        throw new Error(
          `Carga los soportes obligatorios antes de continuar: ${missing
            .map(({ kind }) => evidenceLabel(kind))
            .join(", ")}.`,
        );
    }
    const result = await transaction.complianceCase.updateMany({
      where: { id: caseId, firmId: auth.firmId, version: input.version },
      data: {
        status: input.status,
        activityMode: input.activityMode,
        filedAt: input.filedAt ? new Date(`${input.filedAt}T00:00:00.000Z`) : null,
        paidAt: input.status === "PAID"
          ? (input.paidAt
              ? new Date(`${input.paidAt}T00:00:00.000Z`)
              : (existing.paidAt ?? caracasToday()))
          : input.status === "CLOSED"
            ? existing.paidAt
            : null,
        amount: input.amount ? input.amount.replace(",", ".") : null,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new Error("El expediente cambió en otra sesión. Recarga antes de guardar.");
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "calendar.case.updated",
        entityType: "compliance_case",
        entityId: caseId,
        metadata: {
          status: input.status,
          activityMode: input.activityMode,
          filedAt: input.filedAt,
        },
      },
    });
    return serializeCase(
      await transaction.complianceCase.findUniqueOrThrow({
        where: { id: caseId },
        include: caseInclude,
      }),
    );
  });
}

export async function addCalendarEvidence(
  auth: AuthContext,
  caseId: string,
  rawKind: string,
  file: { name: string; contentType: string; bytes: Uint8Array },
) {
  requirePermission(auth, permissions.calendarManage);
  z.uuid().parse(caseId);
  const kind = evidenceKindSchema.parse(rawKind);
  const target = await withAuthTransaction(auth, async (transaction) => {
    const item = await transaction.complianceCase.findFirstOrThrow({
      where: { id: caseId, firmId: auth.firmId },
      select: {
        id: true,
        companyId: true,
        offeringKind: true,
        evidenceRequirements: true,
      },
    });
    if (!auth.allowedCompanyIds.includes(item.companyId))
      throw new AuthorizationError("No tienes acceso a este expediente.");
    const allowedKinds = item.offeringKind === "TAX"
      ? new Set(
          evidenceRequirementsSchema
            .parse(item.evidenceRequirements)
            .map(({ kind: configuredKind }) => configuredKind),
        )
      : new Set(["INVOICE", "PAYMENT_RECEIPT"]);
    if (!allowedKinds.has(kind))
      throw new Error("Este tipo de soporte no está habilitado para la obligación.");
    return item;
  });
  const objectId = randomUUID();
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-160) || "evidencia";
  const objectKey = `${auth.firmId}/${target.companyId}/compliance/${caseId}/${objectId}/${safeName}`;
  const checksumSha256 = createHash("sha256").update(file.bytes).digest("hex");
  await putPrivateObject({ key: objectKey, body: file.bytes, contentType: file.contentType });
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const previous = await transaction.complianceCaseEvidence.findUnique({
        where: { caseId_kind: { caseId, kind } },
        select: { id: true, storedObjectId: true },
      });
      const storedObject = await transaction.storedObject.create({
        data: {
          id: objectId,
          firmId: auth.firmId,
          companyId: target.companyId,
          uploadedByUserId: auth.userId,
          bucket: privateBucket(),
          objectKey,
          originalName: file.name,
          declaredMime: file.contentType,
          detectedMime: null,
          sizeBytes: BigInt(file.bytes.byteLength),
          checksumSha256,
          status: "QUARANTINED",
        },
      });
      let evidence;
      if (previous) {
        await transaction.storedObject.update({
          where: { id: previous.storedObjectId },
          data: { status: "ARCHIVED" },
        });
        evidence = await transaction.complianceCaseEvidence.update({
          where: { id: previous.id },
          data: { storedObjectId: storedObject.id, uploadedByUserId: auth.userId },
          include: { storedObject: true },
        });
      } else
        evidence = await transaction.complianceCaseEvidence.create({
          data: {
            firmId: auth.firmId,
            companyId: target.companyId,
            caseId,
            storedObjectId: storedObject.id,
            uploadedByUserId: auth.userId,
            kind,
          },
          include: { storedObject: true },
        });
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: previous ? "calendar.evidence.replaced" : "calendar.evidence.uploaded",
          entityType: "compliance_case",
          entityId: caseId,
          metadata: { kind, storedObjectId: storedObject.id, checksumSha256 },
        },
      });
      return {
        id: evidence.id,
        kind: evidence.kind,
        originalName: evidence.storedObject.originalName,
        status: evidence.storedObject.status,
      };
    });
  } catch (error) {
    await deletePrivateObject(objectKey).catch(() => undefined);
    throw error;
  }
}
