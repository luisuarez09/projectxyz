import { randomUUID } from "node:crypto";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { getCalendarPeriod } from "@/modules/calendar/application/calendar";
import { calculateIvaDetermination } from "@/modules/declarations/domain/iva";
import {
  buildIvaFiscalBookSnapshot,
  type IvaBookDocumentInput,
} from "@/modules/declarations/domain/iva-books";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Selecciona un período válido.");
const moneySchema = z.string().trim().regex(/^\d{1,14}(?:[.,]\d{1,6})?$/, "Indica un monto válido.");
const updateSchema = z.object({
  period: periodSchema,
  action: z.enum(["save", "review", "close"]),
  version: z.number().int().positive(),
  selectedPurchaseIds: z.array(z.uuid()).max(1000),
  selectedRetentionIds: z.array(z.uuid()).max(1000),
  filedAt: z.union([z.iso.date(), z.literal("")]).optional().default(""),
  declaredAmount: z.union([moneySchema, z.literal("")]).optional().default(""),
  confirmDifference: z.boolean().optional().default(false),
});

const evidenceLabels: Record<string, string> = {
  SOLVENCY: "Solvencia",
  DECLARATION_RECEIPT: "Certificado de declaración",
  DECLARATION_FILE: "Declaración presentada",
  PAYMENT_FORM: "Planilla de pago",
  PAYMENT_RECEIPT: "Comprobante de pago",
};

function activeCompanyId(auth: AuthContext) {
  requirePermission(auth, permissions.calendarRead);
  if (!auth.activeCompanyId || !auth.allowedCompanyIds.includes(auth.activeCompanyId))
    throw new AuthorizationError("Selecciona una empresa activa autorizada.");
  return auth.activeCompanyId;
}

function monthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
    creditWindowStart: new Date(Date.UTC(year, month - 12, 1)),
  };
}

function decimal(value: { toString(): string } | string | number | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function dateOnly(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? "";
}

function bookDocument(item: {
  id: string;
  issueDate: Date;
  documentNumber: string;
  taxableBase: { toString(): string };
  exemptAmount: { toString(): string };
  nonTaxableAmount: { toString(): string };
  taxAmount: { toString(): string };
  totalAmount: { toString(): string };
  vatRate: { toString(): string } | null;
  vatCreditStatus?: "PENDING" | "APPLIED" | "EXCLUDED" | null;
  counterparty: { legalName: string; rif: string } | null;
  taxRate: { name: string } | null;
  retentions: Array<{
    receiptNumber: string;
    percentage: { toString(): string } | null;
    amount: { toString(): string };
  }>;
}): IvaBookDocumentInput {
  return {
    id: item.id,
    date: dateOnly(item.issueDate),
    partyName: item.counterparty?.legalName ?? "Contraparte sin asociar",
    rif: item.counterparty?.rif ?? "",
    documentNumber: item.documentNumber,
    taxableBase: decimal(item.taxableBase),
    exemptAmount: decimal(item.exemptAmount),
    nonTaxableAmount: decimal(item.nonTaxableAmount),
    taxAmount: decimal(item.taxAmount),
    totalAmount: decimal(item.totalAmount),
    vatRate: decimal(item.vatRate),
    taxRateName: item.taxRate?.name ?? "Alícuota general",
    retentions: item.retentions.map((retention) => ({
      receiptNumber: retention.receiptNumber,
      percentage: decimal(retention.percentage),
      amount: decimal(retention.amount),
    })),
    vatCreditStatus: item.vatCreditStatus,
    hasVatCredit: item.vatCreditStatus !== "EXCLUDED",
  };
}

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function currentCaracasPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find(({ type }) => type === "year")?.value}-${parts.find(({ type }) => type === "month")?.value}`;
}

async function ivaCaseForPeriod(auth: AuthContext, period: string) {
  const companyId = activeCompanyId(auth);
  const calendar = await getCalendarPeriod(auth, period, companyId, "period");
  const item = calendar.cases.find(
    (candidate) => candidate.companyId === companyId && candidate.offeringKey === "iva",
  );
  if (!item)
    throw new Error("La empresa activa no tiene el IVA habilitado con una regla vigente para este período.");
  return { companyId, caseId: item.id };
}

async function ensureIvaDeclaration(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
  caseId: string,
  period: string,
) {
  const existing = await transaction.ivaDeclaration.findUnique({ where: { caseId } });
  if (existing) return existing;
  const previous = await transaction.ivaDeclaration.findFirst({
    where: {
      companyId,
      periodKey: { lt: period },
      complianceCase: { status: { in: ["SUBMITTED", "PAID", "CLOSED"] } },
    },
    orderBy: { periodKey: "desc" },
  });
  return transaction.ivaDeclaration.upsert({
    where: { caseId },
    update: {},
    create: {
      firmId: auth.firmId,
      companyId,
      caseId,
      periodKey: period,
      previousFiscalCredit: previous?.fiscalCreditCarryforward ?? 0,
      previousRetentionCredit: previous?.retentionCreditCarryforward ?? 0,
    },
  });
}

const declarationInclude = {
  documents: { select: { documentId: true, kind: true } },
  retentions: { select: { retentionId: true } },
  fiscalBooks: { select: { kind: true, snapshot: true } },
} satisfies Prisma.IvaDeclarationInclude;

async function workspaceData(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
  caseId: string,
  period: string,
) {
  const { start, end, creditWindowStart } = monthBounds(period);
  const declaration = await ensureIvaDeclaration(transaction, auth, companyId, caseId, period);
  const [company, complianceCase, sales, purchases, retentions, selected] = await Promise.all([
    transaction.company.findFirstOrThrow({
      where: { id: companyId, status: "ACTIVE" },
      select: { id: true, legalName: true, rif: true, fiscalAddress: true },
    }),
    transaction.complianceCase.findFirstOrThrow({
      where: { id: caseId, companyId, offering: { key: "iva", templateKey: "iva" } },
      include: {
        evidences: { include: { storedObject: { select: { originalName: true, status: true } } } },
      },
    }),
    transaction.commercialDocument.findMany({
      where: { companyId, type: "SALE", status: "REGISTERED", issueDate: { gte: start, lte: end } },
      include: {
        counterparty: { select: { legalName: true, rif: true } },
        taxRate: { select: { name: true } },
        retentions: {
          where: { type: "IVA" },
          select: { receiptNumber: true, percentage: true, amount: true },
        },
      },
      orderBy: [{ issueDate: "asc" }, { documentNumber: "asc" }],
    }),
    transaction.commercialDocument.findMany({
      where: {
        companyId,
        type: "PURCHASE",
        status: "REGISTERED",
        issueDate: { gte: creditWindowStart, lte: end },
        OR: [
          { ivaDeclarations: { some: { declarationId: declaration.id } } },
          { vatCreditStatus: { not: "APPLIED" }, ivaDeclarations: { none: {} } },
        ],
      },
      include: {
        counterparty: { select: { legalName: true, rif: true } },
        taxRate: { select: { name: true } },
        retentions: {
          where: { type: "IVA" },
          select: { receiptNumber: true, percentage: true, amount: true },
        },
      },
      orderBy: [{ issueDate: "asc" }, { documentNumber: "asc" }],
    }),
    transaction.commercialRetention.findMany({
      where: {
        companyId,
        type: "IVA",
        issueDate: { lte: end },
        document: { type: "SALE", status: "REGISTERED" },
        OR: [
          { ivaDeclarations: { none: {} } },
          { ivaDeclarations: { some: { declarationId: declaration.id } } },
        ],
      },
      include: {
        attachment: { select: { originalName: true, status: true } },
        document: { include: { counterparty: { select: { legalName: true, rif: true } } } },
      },
      orderBy: [{ issueDate: "asc" }, { receiptNumber: "asc" }],
    }),
    transaction.ivaDeclaration.findUniqueOrThrow({ where: { id: declaration.id }, include: declarationInclude }),
  ]);

  const requirements = z.array(z.object({
    kind: z.enum(["SOLVENCY", "DECLARATION_RECEIPT", "DECLARATION_FILE", "PAYMENT_FORM", "PAYMENT_RECEIPT"]),
    required: z.boolean(),
    fiscalBoard: z.boolean(),
  })).parse(complianceCase.evidenceRequirements);
  const selectedPurchaseIds = selected.documents.filter(({ kind }) => kind === "PURCHASE").map(({ documentId }) => documentId);
  const selectedRetentionIds = selected.retentions.map(({ retentionId }) => retentionId);

  return {
    declaration: {
      id: declaration.id,
      version: declaration.version,
      period,
      periodLabel: complianceCase.periodLabel || periodLabel(period),
      status: complianceCase.status,
      filedAt: dateOnly(complianceCase.filedAt),
      declaredAmount: complianceCase.amount?.toString() ?? "",
      previousFiscalCredit: declaration.previousFiscalCredit.toString(),
      previousRetentionCredit: declaration.previousRetentionCredit.toString(),
      determinedAt: declaration.determinedAt?.toISOString() ?? null,
    },
    fiscalBookSnapshot: selected.fiscalBooks[0]?.snapshot ?? null,
    company,
    case: {
      id: complianceCase.id,
      dueDate: dateOnly(complianceCase.dueDate),
      source: complianceCase.sourceSnapshot ?? "",
      ruleVersion: complianceCase.ruleVersion,
      requirements: requirements.map((requirement) => ({
        ...requirement,
        label: evidenceLabels[requirement.kind] ?? requirement.kind,
      })),
      evidences: complianceCase.evidences.map((evidence) => ({
        id: evidence.id,
        kind: evidence.kind,
        name: evidence.storedObject.originalName,
        status: evidence.storedObject.status,
      })),
    },
    sales: sales.map((item) => ({
      id: item.id,
      date: dateOnly(item.issueDate),
      customer: item.counterparty?.legalName ?? "Venta sin cliente asociado",
      rif: item.counterparty?.rif ?? "",
      documentNumber: item.documentNumber,
      taxableBase: item.taxableBase.toString(),
      exemptAmount: item.exemptAmount.toString(),
      nonTaxableAmount: item.nonTaxableAmount.toString(),
      taxAmount: item.taxAmount.toString(),
      totalAmount: item.totalAmount.toString(),
      vatRate: item.vatRate?.toString() ?? "",
      taxRateName: item.taxRate?.name ?? "",
      retentions: item.retentions.map((retention) => ({
        receiptNumber: retention.receiptNumber,
        percentage: retention.percentage?.toString() ?? "",
        amount: retention.amount.toString(),
      })),
    })),
    purchases: purchases.map((item) => ({
      id: item.id,
      date: dateOnly(item.issueDate),
      supplier: item.counterparty?.legalName ?? "Compra sin proveedor asociado",
      rif: item.counterparty?.rif ?? "",
      documentNumber: item.documentNumber,
      originPeriod: item.impositionPeriod,
      taxableBase: item.taxableBase.toString(),
      exemptAmount: item.exemptAmount.toString(),
      nonTaxableAmount: item.nonTaxableAmount.toString(),
      taxAmount: item.taxAmount.toString(),
      totalAmount: item.totalAmount.toString(),
      vatRate: item.vatRate?.toString() ?? "",
      taxRateName: item.taxRate?.name ?? "",
      retentions: item.retentions.map((retention) => ({
        receiptNumber: retention.receiptNumber,
        percentage: retention.percentage?.toString() ?? "",
        amount: retention.amount.toString(),
      })),
      vatCreditStatus: item.vatCreditStatus,
      hasVatCredit: item.vatCreditStatus === "PENDING" && Number(item.taxAmount) > 0,
      selected: selectedPurchaseIds.includes(item.id),
    })),
    retentions: retentions.map((item) => ({
      id: item.id,
      date: dateOnly(item.issueDate),
      customer: item.document.counterparty?.legalName ?? "Cliente sin asociar",
      rif: item.document.counterparty?.rif ?? "",
      invoiceNumber: item.document.documentNumber,
      receiptNumber: item.receiptNumber,
      percentage: item.percentage?.toString() ?? "",
      amount: item.amount.toString(),
      voucher: item.attachment ? {
        name: item.attachment.originalName,
        status: item.attachment.status,
      } : null,
      selected: selectedRetentionIds.includes(item.id),
    })),
    canManage: auth.permissionKeys.includes(permissions.calendarManage),
  };
}

export async function getIvaDeclarationWorkspace(auth: AuthContext, rawPeriod: unknown) {
  const period = periodSchema.parse(rawPeriod);
  const { companyId, caseId } = await ivaCaseForPeriod(auth, period);
  return withAuthTransaction(auth, (transaction) => workspaceData(transaction, auth, companyId, caseId, period));
}

export async function updateIvaDeclaration(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.calendarManage);
  const companyId = activeCompanyId(auth);
  const input = updateSchema.parse(rawInput);
  const { caseId } = await ivaCaseForPeriod(auth, input.period);
  const { start, end, creditWindowStart } = monthBounds(input.period);

  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const declaration = await transaction.ivaDeclaration.findFirstOrThrow({
        where: { caseId, companyId },
        include: {
          complianceCase: { include: { evidences: true } },
          company: { select: { legalName: true, rif: true, fiscalAddress: true } },
        },
      });
      if (["SUBMITTED", "PAID", "CLOSED"].includes(declaration.complianceCase.status))
        throw new Error("La declaración ya fue cerrada y solo está disponible para consulta.");
      if (declaration.version !== input.version)
        throw new Error("La determinación cambió en otra sesión. Recarga antes de guardar.");

      const [sales, purchases, retentions] = await Promise.all([
        transaction.commercialDocument.findMany({
          where: { companyId, type: "SALE", status: "REGISTERED", issueDate: { gte: start, lte: end } },
          include: {
            counterparty: { select: { legalName: true, rif: true } },
            taxRate: { select: { name: true } },
            retentions: {
              where: { type: "IVA" },
              select: { receiptNumber: true, percentage: true, amount: true },
            },
          },
        }),
        transaction.commercialDocument.findMany({
          where: {
            id: { in: input.selectedPurchaseIds },
            companyId,
            type: "PURCHASE",
            status: "REGISTERED",
            issueDate: { gte: creditWindowStart, lte: end },
            OR: [
              { ivaDeclarations: { none: {} } },
              { ivaDeclarations: { some: { declarationId: declaration.id } } },
            ],
          },
          include: {
            counterparty: { select: { legalName: true, rif: true } },
            taxRate: { select: { name: true } },
            retentions: {
              where: { type: "IVA" },
              select: { receiptNumber: true, percentage: true, amount: true },
            },
          },
        }),
        transaction.commercialRetention.findMany({
          where: {
            id: { in: input.selectedRetentionIds },
            companyId,
            type: "IVA",
            issueDate: { lte: end },
            document: { type: "SALE", status: "REGISTERED" },
            OR: [
              { ivaDeclarations: { none: {} } },
              { ivaDeclarations: { some: { declarationId: declaration.id } } },
            ],
          },
          include: { attachment: true },
        }),
      ]);
      if (purchases.length !== new Set(input.selectedPurchaseIds).size)
        throw new Error("Una compra seleccionada ya no está disponible o quedó fuera de la ventana configurada de 12 meses.");
      if (retentions.length !== new Set(input.selectedRetentionIds).size)
        throw new Error("Una retención seleccionada ya no está disponible.");
      if (input.action === "close") {
        const withoutVoucher = retentions.filter(({ attachment }) => !attachment);
        if (withoutVoucher.length)
          throw new Error("Carga el comprobante de cada retención seleccionada antes de cerrar la declaración.");
      }

      const totals = calculateIvaDetermination({
        sales: sales.map((item) => ({ taxableBase: decimal(item.taxableBase), exemptAmount: decimal(item.exemptAmount), taxAmount: decimal(item.taxAmount) })),
        purchases: purchases.map((item) => ({ taxAmount: item.vatCreditStatus === "PENDING" ? decimal(item.taxAmount) : 0 })),
        retentions: retentions.map((item) => ({ amount: decimal(item.amount) })),
        previousFiscalCredit: decimal(declaration.previousFiscalCredit),
        previousRetentionCredit: decimal(declaration.previousRetentionCredit),
      });
      const declaredAmount = input.declaredAmount ? Number(input.declaredAmount.replace(",", ".")) : totals.taxPayable;
      if (input.action === "close") {
        if (!input.filedAt) throw new Error("Indica la fecha en la que se presentó la declaración en SENIAT.");
        if (!Number.isFinite(declaredAmount) || declaredAmount < 0) throw new Error("Indica el monto declarado en SENIAT.");
        if (Math.abs(declaredAmount - totals.taxPayable) > 0.01 && !input.confirmDifference)
          throw new Error("Confirma la diferencia entre el monto determinado y el monto presentado en SENIAT.");
        const configured = z.array(z.object({ kind: z.string(), required: z.boolean() })).parse(declaration.complianceCase.evidenceRequirements);
        const evidenceKinds = new Set(declaration.complianceCase.evidences.map(({ kind }) => kind));
        const missing = configured.filter(({ kind, required }) =>
          required && !["PAYMENT_FORM", "PAYMENT_RECEIPT"].includes(kind) && !evidenceKinds.has(kind as never),
        );
        if (missing.length)
          throw new Error(`Carga los soportes obligatorios antes de cerrar: ${missing.map(({ kind }) => evidenceLabels[kind] ?? kind).join(", ")}.`);
      }

      await transaction.ivaDeclarationDocument.deleteMany({ where: { declarationId: declaration.id } });
      await transaction.ivaDeclarationRetention.deleteMany({ where: { declarationId: declaration.id } });
      const documentRows = [
        ...sales.map((document) => ({ firmId: auth.firmId, companyId, declarationId: declaration.id, documentId: document.id, kind: "SALE" as const })),
        ...purchases.map((document) => ({ firmId: auth.firmId, companyId, declarationId: declaration.id, documentId: document.id, kind: "PURCHASE" as const })),
      ];
      if (documentRows.length) await transaction.ivaDeclarationDocument.createMany({ data: documentRows });
      if (retentions.length)
        await transaction.ivaDeclarationRetention.createMany({
          data: retentions.map((retention) => ({ firmId: auth.firmId, companyId, declarationId: declaration.id, retentionId: retention.id })),
        });

      const now = new Date();
      if (input.action === "close") {
        const snapshot = buildIvaFiscalBookSnapshot({
          generatedAt: now.toISOString(),
          period: input.period,
          periodLabel: declaration.complianceCase.periodLabel || periodLabel(input.period),
          company: {
            legalName: declaration.company.legalName,
            rif: declaration.company.rif,
            fiscalAddress: declaration.company.fiscalAddress ?? "",
          },
          source: {
            ruleSource: declaration.complianceCase.sourceSnapshot ?? "",
            ruleVersion: declaration.complianceCase.ruleVersion,
          },
          sales: sales.map(bookDocument),
          purchases: purchases.map(bookDocument),
        });
        await Promise.all([
          transaction.ivaFiscalBook.upsert({
            where: { declarationId_kind: { declarationId: declaration.id, kind: "SALES" } },
            update: { snapshot: snapshot as Prisma.InputJsonValue, generatedAt: now },
            create: {
              firmId: auth.firmId,
              companyId,
              declarationId: declaration.id,
              periodKey: input.period,
              kind: "SALES",
              snapshot: snapshot as Prisma.InputJsonValue,
              generatedAt: now,
            },
          }),
          transaction.ivaFiscalBook.upsert({
            where: { declarationId_kind: { declarationId: declaration.id, kind: "PURCHASES" } },
            update: { snapshot: snapshot as Prisma.InputJsonValue, generatedAt: now },
            create: {
              firmId: auth.firmId,
              companyId,
              declarationId: declaration.id,
              periodKey: input.period,
              kind: "PURCHASES",
              snapshot: snapshot as Prisma.InputJsonValue,
              generatedAt: now,
            },
          }),
        ]);
      }
      await transaction.ivaDeclaration.update({
        where: { id: declaration.id },
        data: {
          salesTaxableBase: totals.taxableBase,
          salesExemptAmount: totals.exemptAmount,
          debitTax: totals.debitTax,
          purchaseTaxCredit: totals.purchaseTaxCredit,
          deductibleTaxCredit: totals.deductibleTaxCredit,
          currentRetentionCredit: totals.currentRetentionCredit,
          prorationFactor: totals.prorationFactor,
          taxPayable: totals.taxPayable,
          fiscalCreditCarryforward: totals.fiscalCreditCarryforward,
          retentionCreditCarryforward: totals.retentionCreditCarryforward,
          determinedAt: input.action === "close" ? now : declaration.determinedAt,
          version: { increment: 1 },
        },
      });
      await transaction.complianceCase.update({
        where: { id: caseId },
        data: {
          status: input.action === "close" ? "SUBMITTED" : input.action === "review" ? "READY_FOR_REVIEW" : "PREPARING",
          activityMode: sales.length ? "WITH_ACTIVITY" : "WITHOUT_ACTIVITY",
          filedAt: input.action === "close" ? new Date(`${input.filedAt}T00:00:00.000Z`) : declaration.complianceCase.filedAt,
          amount: input.action === "close" ? declaredAmount : declaration.complianceCase.amount,
          version: { increment: 1 },
        },
      });
      if (input.action === "close") {
        if (sales.length)
          await transaction.commercialDocument.updateMany({ where: { id: { in: sales.map(({ id }) => id) } }, data: { declaredAt: now } });
        if (purchases.length)
          await transaction.commercialDocument.updateMany({ where: { id: { in: purchases.map(({ id }) => id) } }, data: { declaredAt: now, vatCreditStatus: "APPLIED" } });
      }
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: `declaration.iva.${input.action}`,
          entityType: "iva_declaration",
          entityId: declaration.id,
          metadata: {
            caseId,
            period: input.period,
            selectedPurchaseIds: input.selectedPurchaseIds,
            selectedRetentionIds: input.selectedRetentionIds,
            totals,
            declaredAmount: input.action === "close" ? declaredAmount : null,
          },
        },
      });
      return workspaceData(transaction, auth, companyId, caseId, input.period);
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002")
      throw new Error("Una compra o retención fue reservada por otra declaración. Recarga el expediente.");
    throw error;
  }
}

export async function listDeclarations(auth: AuthContext) {
  const companyId = activeCompanyId(auth);
  const currentPeriod = currentCaracasPeriod();
  const { end: currentPeriodEnd } = monthBounds(currentPeriod);
  await getCalendarPeriod(auth, currentPeriod, companyId, "period");
  return withAuthTransaction(auth, async (transaction) => {
    const [company, cases] = await Promise.all([
      transaction.company.findFirstOrThrow({ where: { id: companyId, status: "ACTIVE" }, select: { id: true, legalName: true, rif: true } }),
      transaction.complianceCase.findMany({
        where: {
          firmId: auth.firmId,
          companyId,
          offeringKind: "TAX",
          suppressedAt: null,
          OR: [
            { periodMonth: { lte: currentPeriodEnd } },
            { status: { not: "PENDING" } },
          ],
        },
        include: {
          offering: { select: { key: true, templateKey: true } },
          assignedProfile: { select: { displayName: true } },
          company: { select: { responsibleProfile: { select: { displayName: true } } } },
          ivaDeclaration: { select: { taxPayable: true } },
        },
        orderBy: [{ periodMonth: "desc" }, { offeringName: "asc" }],
      }),
    ]);
    return {
      company,
      declarations: cases.map((item) => ({
        id: item.id,
        tax: item.offeringName,
        offeringKey: item.offering.key,
        templateKey: item.offering.templateKey,
        periodKey: item.periodKey,
        period: item.periodLabel,
        cadence: item.cadence,
        deadlineBasis: item.deadlineBasis,
        dueDate: dateOnly(item.dueDate),
        status: item.status,
        amount: item.amount?.toString() ?? item.ivaDeclaration?.taxPayable.toString() ?? "",
        owner: item.assignedProfile?.displayName ?? item.company.responsibleProfile?.displayName ?? "Sin responsable",
      })),
      canManage: auth.permissionKeys.includes(permissions.calendarManage),
    };
  });
}
