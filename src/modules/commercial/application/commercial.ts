import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
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

const kindSchema = z.enum(["customer", "supplier"]);
const nullableUuid = z
  .union([z.uuid(), z.literal(""), z.null()])
  .transform((value) => value || null);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default("");
const decimal = z
  .string()
  .trim()
  .regex(
    /^\d{1,14}(?:\.\d{1,6})?$/,
    "Usa un importe positivo con hasta seis decimales.",
  );

export const commercialPartyInputSchema = z.object({
  kind: kindSchema,
  legalName: z.string().trim().min(2).max(250),
  rif: z.string().trim().min(5).max(20),
  fiscalAddress: optionalText(1000),
  email: z
    .union([z.literal(""), z.email()])
    .optional()
    .default(""),
  phone: optionalText(50),
  primaryAccountId: nullableUuid,
  counterpartAccountId: nullableUuid,
});

export const commercialPartyUpdateSchema = commercialPartyInputSchema.extend({
  version: z.number().int().positive(),
});

export const commercialDocumentInputSchema = z
  .object({
    type: z.enum(["sale", "purchase"]),
    counterpartyId: z.uuid(),
    documentNumber: z.string().trim().max(80).optional().default(""),
    issueDate: z.iso.date(),
    currencyCode: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
    taxableBase: decimal,
    exemptAmount: decimal,
    nonTaxableAmount: decimal.optional().default("0.000000"),
    taxAmount: decimal,
    totalAmount: decimal,
    vatRateId: nullableUuid,
    hasVatCredit: z.boolean().optional().default(true),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(1).max(500),
          quantity: decimal,
          unitPrice: decimal,
          taxable: z.boolean(),
        }),
      )
      .max(100)
      .optional()
      .default([]),
    accountingEntries: z
      .array(
        z.object({
          accountId: z.uuid(),
          debit: decimal,
          credit: decimal,
          source: z.string().trim().min(1).max(40),
        }),
      )
      .min(2)
      .max(100),
    retentions: z
      .array(
        z.object({
          type: z.enum(["IVA", "ISLR"]),
          receiptNumber: z.string().trim().min(1).max(80),
          issueDate: z.iso.date(),
          percentage: z
            .union([decimal, z.literal("")])
            .optional()
            .default(""),
          amount: decimal,
        }),
      )
      .max(2)
      .optional()
      .default([]),
  })
  .superRefine((input, context) => {
    if (input.type === "purchase" && !input.documentNumber)
      context.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "Indica el número de la factura de compra.",
      });
    if (
      new Set(input.retentions.map((retention) => retention.type)).size !==
      input.retentions.length
    )
      context.addIssue({
        code: "custom",
        path: ["retentions"],
        message:
          "Solo puede existir una retención de IVA y una de ISLR por factura.",
      });
  });

export type CommercialUpload = {
  name: string;
  contentType: string;
  bytes: Uint8Array;
};
export type CommercialUploads = {
  invoice?: CommercialUpload;
  retentionIVA?: CommercialUpload;
  retentionISLR?: CommercialUpload;
};

export class CommercialConflictError extends Error {}
export class CommercialNotFoundError extends Error {}

const databaseKind = { customer: "CUSTOMER", supplier: "SUPPLIER" } as const;
const databaseDocumentType = { sale: "SALE", purchase: "PURCHASE" } as const;
const routeKind = { CUSTOMER: "customer", SUPPLIER: "supplier" } as const;
const routeDocumentType = { SALE: "sale", PURCHASE: "purchase" } as const;

function activeCompanyId(auth: AuthContext) {
  requirePermission(auth, permissions.counterpartiesRead);
  if (
    !auth.activeCompanyId ||
    !auth.allowedCompanyIds.includes(auth.activeCompanyId)
  ) {
    throw new AuthorizationError("Selecciona una empresa activa autorizada.");
  }
  return auth.activeCompanyId;
}

function assertPartyManagement(auth: AuthContext) {
  requirePermission(auth, permissions.counterpartiesManage);
  return activeCompanyId(auth);
}

function normalizeRif(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function accountLabel(account: { code: string; name: string } | null) {
  return account ? `${account.code} · ${account.name}` : "Sin cuenta asignada";
}

function serializeParty(role: {
  id: string;
  kind: "CUSTOMER" | "SUPPLIER";
  status: "ACTIVE" | "ARCHIVED";
  version: number;
  primaryAccount: { id: string; code: string; name: string } | null;
  counterpartAccount: { id: string; code: string; name: string } | null;
  counterparty: {
    id: string;
    legalName: string;
    rif: string;
    fiscalAddress: string | null;
    email: string | null;
    phone: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    _count?: { documents: number };
  };
}) {
  return {
    id: role.counterparty.id,
    roleId: role.id,
    kind: routeKind[role.kind],
    legalName: role.counterparty.legalName,
    rif: role.counterparty.rif,
    fiscalAddress: role.counterparty.fiscalAddress ?? "",
    email: role.counterparty.email ?? "",
    phone: role.counterparty.phone ?? "",
    primaryAccountId: role.primaryAccount?.id ?? null,
    primaryAccount: accountLabel(role.primaryAccount),
    counterpartAccountId: role.counterpartAccount?.id ?? null,
    counterpartAccount: accountLabel(role.counterpartAccount),
    invoiceCount: role.counterparty._count?.documents ?? 0,
    version: role.counterparty.version,
    roleVersion: role.version,
    createdAt: role.counterparty.createdAt.toISOString(),
    updatedAt: role.counterparty.updatedAt.toISOString(),
  };
}

function serializeDocument(document: {
  id: string;
  type: "SALE" | "PURCHASE";
  documentNumber: string;
  issueDate: Date;
  impositionPeriod: string;
  currencyCode: string;
  taxableBase: { toString(): string };
  exemptAmount: { toString(): string };
  nonTaxableAmount: { toString(): string };
  taxAmount: { toString(): string };
  totalAmount: { toString(): string };
  vatRate?: { toString(): string } | null;
  vatSource?: string | null;
  vatCreditStatus?: "PENDING" | "APPLIED" | "EXCLUDED" | null;
  declaredAt?: Date | null;
  voidReason?: string | null;
  status: "REGISTERED" | "VOIDED";
  createdAt: Date;
  counterparty?: { legalName: string; rif: string } | null;
  invoiceAttachment?: { originalName: string; status: string } | null;
  retentions?: Array<{
    id: string;
    type: "IVA" | "ISLR";
    receiptNumber: string;
    issueDate: Date;
    percentage: { toString(): string } | null;
    amount: { toString(): string };
    attachment?: { originalName: string; status: string } | null;
  }>;
}) {
  return {
    id: document.id,
    type: routeDocumentType[document.type],
    documentNumber: document.documentNumber,
    issueDate: document.issueDate.toISOString().slice(0, 10),
    impositionPeriod: document.impositionPeriod,
    currencyCode: document.currencyCode,
    taxableBase: document.taxableBase.toString(),
    exemptAmount: document.exemptAmount.toString(),
    nonTaxableAmount: document.nonTaxableAmount.toString(),
    taxAmount: document.taxAmount.toString(),
    totalAmount: document.totalAmount.toString(),
    vatRate: document.vatRate?.toString() ?? null,
    vatSource: document.vatSource ?? null,
    vatCreditStatus: document.vatCreditStatus?.toLowerCase() ?? null,
    voidReason: document.voidReason ?? null,
    status: document.declaredAt ? "declared" : document.status.toLowerCase(),
    declaredAt: document.declaredAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    counterparty: document.counterparty ?? null,
    invoiceAttachment: document.invoiceAttachment
      ? {
          name: document.invoiceAttachment.originalName,
          status: document.invoiceAttachment.status.toLowerCase(),
        }
      : null,
    retentions:
      document.retentions?.map((retention) => ({
        id: retention.id,
        type: retention.type,
        receiptNumber: retention.receiptNumber,
        issueDate: retention.issueDate.toISOString().slice(0, 10),
        percentage: retention.percentage?.toString() ?? null,
        amount: retention.amount.toString(),
        attachment: retention.attachment
          ? {
              name: retention.attachment.originalName,
              status: retention.attachment.status.toLowerCase(),
            }
          : null,
      })) ?? [],
  };
}

async function validateAccounts(
  transaction: Prisma.TransactionClient,
  companyId: string,
  accountIds: Array<string | null>,
) {
  const uniqueIds = [
    ...new Set(accountIds.filter((value): value is string => Boolean(value))),
  ];
  if (!uniqueIds.length) return;
  const count = await transaction.companyChartAccount.count({
    where: {
      id: { in: uniqueIds },
      companyId,
      status: "ACTIVE",
      acceptsMovements: true,
    },
  });
  if (count !== uniqueIds.length)
    throw new CommercialConflictError(
      "Una cuenta seleccionada no pertenece al plan activo de esta empresa.",
    );
}

async function audit(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  eventType: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue,
) {
  await transaction.auditEvent.create({
    data: {
      firmId: auth.firmId,
      actorUserId: auth.userId,
      requestId: randomUUID(),
      eventType,
      entityType,
      entityId,
      metadata,
    },
  });
}

export async function listCommercialParties(
  auth: AuthContext,
  rawKind: string | null,
) {
  const companyId = activeCompanyId(auth);
  const kind = kindSchema.parse(rawKind);
  const type = kind === "customer" ? "SALE" : "PURCHASE";
  return withAuthTransaction(auth, async (transaction) => {
    const [company, roles, accounts] = await Promise.all([
      transaction.company.findFirstOrThrow({
        where: { id: companyId, status: "ACTIVE" },
        select: { id: true, legalName: true },
      }),
      transaction.commercialPartyRole.findMany({
        where: {
          companyId,
          kind: databaseKind[kind],
          status: "ACTIVE",
          counterparty: { status: "ACTIVE" },
        },
        include: {
          primaryAccount: { select: { id: true, code: true, name: true } },
          counterpartAccount: { select: { id: true, code: true, name: true } },
          counterparty: {
            select: {
              id: true,
              legalName: true,
              rif: true,
              fiscalAddress: true,
              email: true,
              phone: true,
              version: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  documents: { where: { type, status: "REGISTERED" } },
                },
              },
            },
          },
        },
        orderBy: { counterparty: { legalName: "asc" } },
      }),
      transaction.companyChartAccount.findMany({
        where: { companyId, status: "ACTIVE", acceptsMovements: true },
        select: { id: true, code: true, name: true, type: true, nature: true },
        orderBy: { code: "asc" },
      }),
    ]);
    return {
      company,
      parties: roles.map(serializeParty),
      accounts: accounts.map((account) => ({
        ...account,
        label: `${account.code} · ${account.name}`,
      })),
      canManage: auth.permissionKeys.includes(permissions.counterpartiesManage),
    };
  });
}

export async function createCommercialParty(
  auth: AuthContext,
  rawInput: unknown,
) {
  const companyId = assertPartyManagement(auth);
  const input = commercialPartyInputSchema.parse(rawInput);
  const normalizedRif = normalizeRif(input.rif);
  if (normalizedRif.length < 5)
    throw new CommercialConflictError(
      "El RIF no tiene un formato reconocible.",
    );

  try {
    return await withAuthTransaction(auth, async (transaction) => {
      await validateAccounts(transaction, companyId, [
        input.primaryAccountId,
        input.counterpartAccountId,
      ]);
      let counterparty = await transaction.commercialCounterparty.findUnique({
        where: { companyId_normalizedRif: { companyId, normalizedRif } },
      });
      const existingRole = counterparty
        ? await transaction.commercialPartyRole.findUnique({
            where: {
              counterpartyId_kind: {
                counterpartyId: counterparty.id,
                kind: databaseKind[input.kind],
              },
            },
          })
        : null;
      if (existingRole?.status === "ACTIVE")
        throw new CommercialConflictError(
          `Ya existe un ${input.kind === "customer" ? "cliente" : "proveedor"} con ese RIF.`,
        );

      if (counterparty) {
        counterparty = await transaction.commercialCounterparty.update({
          where: { id: counterparty.id },
          data: {
            legalName: input.legalName,
            normalizedName: normalizeName(input.legalName),
            rif: input.rif.toUpperCase(),
            fiscalAddress: input.fiscalAddress || null,
            email: input.email || null,
            phone: input.phone || null,
            status: "ACTIVE",
            archivedAt: null,
            version: { increment: 1 },
          },
        });
      } else {
        counterparty = await transaction.commercialCounterparty.create({
          data: {
            firmId: auth.firmId,
            companyId,
            legalName: input.legalName,
            normalizedName: normalizeName(input.legalName),
            rif: input.rif.toUpperCase(),
            normalizedRif,
            fiscalAddress: input.fiscalAddress || null,
            email: input.email || null,
            phone: input.phone || null,
          },
        });
      }

      const role = existingRole
        ? await transaction.commercialPartyRole.update({
            where: { id: existingRole.id },
            data: {
              primaryAccountId: input.primaryAccountId,
              counterpartAccountId: input.counterpartAccountId,
              status: "ACTIVE",
              archivedAt: null,
              version: { increment: 1 },
            },
          })
        : await transaction.commercialPartyRole.create({
            data: {
              firmId: auth.firmId,
              companyId,
              counterpartyId: counterparty.id,
              kind: databaseKind[input.kind],
              primaryAccountId: input.primaryAccountId,
              counterpartAccountId: input.counterpartAccountId,
            },
          });
      await audit(
        transaction,
        auth,
        "commercial.counterparty.created",
        "commercial_counterparty",
        counterparty.id,
        { companyId, kind: input.kind, roleId: role.id },
      );
      const saved = await transaction.commercialPartyRole.findUniqueOrThrow({
        where: { id: role.id },
        include: {
          primaryAccount: { select: { id: true, code: true, name: true } },
          counterpartAccount: { select: { id: true, code: true, name: true } },
          counterparty: {
            select: {
              id: true,
              legalName: true,
              rif: true,
              fiscalAddress: true,
              email: true,
              phone: true,
              version: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
      return serializeParty(saved);
    });
  } catch (error) {
    if (error instanceof CommercialConflictError) throw error;
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new CommercialConflictError(
        "Ya existe una contraparte con esos datos.",
      );
    }
    throw error;
  }
}

export async function updateCommercialParty(
  auth: AuthContext,
  counterpartyId: string,
  rawInput: unknown,
) {
  const companyId = assertPartyManagement(auth);
  const id = z.uuid().parse(counterpartyId);
  const input = commercialPartyUpdateSchema.parse(rawInput);
  const normalizedRif = normalizeRif(input.rif);
  return withAuthTransaction(auth, async (transaction) => {
    await validateAccounts(transaction, companyId, [
      input.primaryAccountId,
      input.counterpartAccountId,
    ]);
    const role = await transaction.commercialPartyRole.findFirst({
      where: {
        counterpartyId: id,
        companyId,
        kind: databaseKind[input.kind],
        status: "ACTIVE",
      },
    });
    if (!role)
      throw new CommercialNotFoundError(
        "No se encontró la contraparte solicitada.",
      );
    const updated = await transaction.commercialCounterparty.updateMany({
      where: { id, companyId, version: input.version, status: "ACTIVE" },
      data: {
        legalName: input.legalName,
        normalizedName: normalizeName(input.legalName),
        rif: input.rif.toUpperCase(),
        normalizedRif,
        fiscalAddress: input.fiscalAddress || null,
        email: input.email || null,
        phone: input.phone || null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new CommercialConflictError(
        "La ficha cambió en otra sesión. Recarga antes de guardar.",
      );
    await transaction.commercialPartyRole.update({
      where: { id: role.id },
      data: {
        primaryAccountId: input.primaryAccountId,
        counterpartAccountId: input.counterpartAccountId,
        version: { increment: 1 },
      },
    });
    await audit(
      transaction,
      auth,
      "commercial.counterparty.updated",
      "commercial_counterparty",
      id,
      { companyId, kind: input.kind },
    );
    const saved = await transaction.commercialPartyRole.findUniqueOrThrow({
      where: { id: role.id },
      include: {
        primaryAccount: { select: { id: true, code: true, name: true } },
        counterpartAccount: { select: { id: true, code: true, name: true } },
        counterparty: {
          select: {
            id: true,
            legalName: true,
            rif: true,
            fiscalAddress: true,
            email: true,
            phone: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    return serializeParty(saved);
  });
}

export async function archiveCommercialParty(
  auth: AuthContext,
  counterpartyId: string,
  rawKind: string | null,
) {
  const companyId = assertPartyManagement(auth);
  const id = z.uuid().parse(counterpartyId);
  const kind = kindSchema.parse(rawKind);
  return withAuthTransaction(auth, async (transaction) => {
    const role = await transaction.commercialPartyRole.findFirst({
      where: {
        counterpartyId: id,
        companyId,
        kind: databaseKind[kind],
        status: "ACTIVE",
      },
    });
    if (!role)
      throw new CommercialNotFoundError(
        "No se encontró la contraparte solicitada.",
      );
    const archivedAt = new Date();
    await transaction.commercialPartyRole.update({
      where: { id: role.id },
      data: { status: "ARCHIVED", archivedAt, version: { increment: 1 } },
    });
    const remainingRoles = await transaction.commercialPartyRole.count({
      where: { counterpartyId: id, status: "ACTIVE" },
    });
    if (!remainingRoles)
      await transaction.commercialCounterparty.update({
        where: { id },
        data: { status: "ARCHIVED", archivedAt, version: { increment: 1 } },
      });
    await audit(
      transaction,
      auth,
      "commercial.counterparty.archived",
      "commercial_counterparty",
      id,
      { companyId, kind },
    );
    return { id, archived: true };
  });
}

export async function getCommercialPartyProfile(
  auth: AuthContext,
  counterpartyId: string,
  rawKind: string | null,
) {
  const companyId = activeCompanyId(auth);
  const id = z.uuid().parse(counterpartyId);
  const kind = kindSchema.parse(rawKind);
  const type = kind === "customer" ? "SALE" : "PURCHASE";
  return withAuthTransaction(auth, async (transaction) => {
    const role = await transaction.commercialPartyRole.findFirst({
      where: {
        counterpartyId: id,
        companyId,
        kind: databaseKind[kind],
        status: "ACTIVE",
        counterparty: { status: "ACTIVE" },
      },
      include: {
        primaryAccount: { select: { id: true, code: true, name: true } },
        counterpartAccount: { select: { id: true, code: true, name: true } },
        counterparty: {
          select: {
            id: true,
            legalName: true,
            rif: true,
            fiscalAddress: true,
            email: true,
            phone: true,
            version: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!role)
      throw new CommercialNotFoundError(
        "No se encontró la contraparte solicitada.",
      );
    const documents = await transaction.commercialDocument.findMany({
      where: { counterpartyId: id, companyId, type },
      include: {
        counterparty: { select: { legalName: true, rif: true } },
        invoiceAttachment: { select: { originalName: true, status: true } },
        retentions: {
          include: {
            attachment: { select: { originalName: true, status: true } },
          },
          orderBy: { type: "asc" },
        },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    });
    const registered = documents.filter(
      (document) => document.status === "REGISTERED",
    );
    const totalsByCurrency = registered.reduce<Record<string, number>>(
      (totals, document) => {
        totals[document.currencyCode] =
          (totals[document.currencyCode] ?? 0) +
          Number(document.totalAmount.toString());
        return totals;
      },
      {},
    );
    return {
      party: serializeParty(role),
      documents: documents.map(serializeDocument),
      summary: {
        documentCount: registered.length,
        totalsByCurrency: Object.fromEntries(
          Object.entries(totalsByCurrency).map(([currency, total]) => [
            currency,
            total.toFixed(2),
          ]),
        ),
        lastIssueDate:
          registered[0]?.issueDate.toISOString().slice(0, 10) ?? null,
        currencies: [
          ...new Set(registered.map((document) => document.currencyCode)),
        ],
      },
      canManage: auth.permissionKeys.includes(permissions.counterpartiesManage),
    };
  });
}

/* Legacy document creation kept temporarily below for migration context.
export async function createCommercialDocument(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const input = commercialDocumentInputSchema.parse(rawInput);
  const calculatedTotal = new Prisma.Decimal(input.taxableBase).plus(input.exemptAmount).plus(input.taxAmount);
  if (!calculatedTotal.equals(input.totalAmount)) {
    throw new CommercialConflictError("El total de la factura no coincide con sus bases e impuesto.");
  }
  const type = databaseDocumentType[input.type];
  const kind = input.type === "sale" ? "CUSTOMER" : "SUPPLIER";
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const role = await transaction.commercialPartyRole.findFirst({
        where: { counterpartyId: input.counterpartyId, companyId, kind, status: "ACTIVE", counterparty: { status: "ACTIVE" } },
      });
      if (!role) throw new CommercialNotFoundError(`Selecciona un ${input.type === "sale" ? "cliente" : "proveedor"} registrado y activo.`);
      const document = await transaction.commercialDocument.create({
        data: {
          firmId: auth.firmId,
          companyId,
          counterpartyId: input.counterpartyId,
          type,
          documentNumber: input.documentNumber,
          issueDate: new Date(`${input.issueDate}T00:00:00.000Z`),
          currencyCode: input.currencyCode,
          taxableBase: input.taxableBase,
          exemptAmount: input.exemptAmount,
          nonTaxableAmount: input.nonTaxableAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
        },
      });
      await audit(transaction, auth, "commercial.document.registered", "commercial_document", document.id, { companyId, type: input.type, counterpartyId: input.counterpartyId, documentNumber: input.documentNumber });
      return serializeDocument(document);
    });
  } catch (error) {
    if (error instanceof CommercialNotFoundError) throw error;
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new CommercialConflictError("Ya existe una factura con ese número para la contraparte seleccionada.");
    }
    throw error;
  }
}
*/

function normalizeDocumentNumber(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function saleNumber(prefix: string, sequence: number, padding: number) {
  return `${prefix}${String(sequence).padStart(padding, "0")}`;
}

const asDecimal = (value: string) => new Prisma.Decimal(value);
const decimalClose = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.minus(right).abs().lessThanOrEqualTo(new Prisma.Decimal("0.005"));

async function ensureCommercialSettings(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
) {
  return transaction.companyCommercialSettings.upsert({
    where: { companyId },
    create: { firmId: auth.firmId, companyId },
    update: {},
  });
}

async function allocateSaleNumber(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
) {
  await ensureCommercialSettings(transaction, auth, companyId);
  const rows = await transaction.$queryRaw<
    Array<{ sequenceNumber: number; prefix: string; padding: number }>
  >`
    UPDATE "app"."company_commercial_settings"
    SET "next_sales_invoice_number" = "next_sales_invoice_number" + 1,
        "version" = "version" + 1,
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "company_id" = ${companyId}::uuid
    RETURNING "next_sales_invoice_number" - 1 AS "sequenceNumber",
              "sales_invoice_prefix" AS "prefix",
              "sales_invoice_padding" AS "padding"
  `;
  const allocated = rows[0];
  if (!allocated)
    throw new CommercialConflictError(
      "No fue posible reservar el correlativo de venta.",
    );
  return {
    ...allocated,
    documentNumber: saleNumber(
      allocated.prefix,
      allocated.sequenceNumber,
      allocated.padding,
    ),
  };
}

async function configuredVatRate(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
  date: Date,
) {
  const companyHasVat = await transaction.companyOffering.findUnique({
    where: {
      companyId_kind_offeringKey: {
        companyId,
        kind: "TAX",
        offeringKey: "iva",
      },
    },
    select: { companyId: true },
  });
  if (!companyHasVat) return null;

  return transaction.taxRate.findFirst({
    where: {
      firmId: auth.firmId,
      active: true,
      offering: { firmId: auth.firmId, key: "iva", kind: "TAX", active: true },
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: date } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
      ],
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
  });
}

type PreparedUpload = CommercialUpload & {
  id: string;
  key: string;
  checksum: string;
};

async function prepareUpload(
  auth: AuthContext,
  companyId: string,
  documentId: string,
  slot: string,
  file?: CommercialUpload,
) {
  if (!file) return undefined;
  const allowed =
    file.contentType === "application/pdf" ||
    file.contentType.startsWith("image/");
  if (!allowed)
    throw new CommercialConflictError("Los soportes deben ser PDF, JPG o PNG.");
  if (!file.bytes.byteLength || file.bytes.byteLength > 20 * 1024 * 1024)
    throw new CommercialConflictError(
      "Cada soporte debe pesar entre 1 byte y 20 MB.",
    );
  const id = randomUUID();
  const safeName =
    file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(-160) || "soporte";
  const key = `${auth.firmId}/${companyId}/commercial/${documentId}/${slot}/${id}/${safeName}`;
  const checksum = createHash("sha256").update(file.bytes).digest("hex");
  await putPrivateObject({
    key,
    body: file.bytes,
    contentType: file.contentType,
  });
  return { ...file, id, key, checksum } satisfies PreparedUpload;
}

async function createStoredObject(
  transaction: Prisma.TransactionClient,
  auth: AuthContext,
  companyId: string,
  file?: PreparedUpload,
) {
  if (!file) return null;
  return transaction.storedObject.create({
    data: {
      id: file.id,
      firmId: auth.firmId,
      companyId,
      uploadedByUserId: auth.userId,
      bucket: privateBucket(),
      objectKey: file.key,
      originalName: file.name,
      declaredMime: file.contentType,
      sizeBytes: BigInt(file.bytes.byteLength),
      checksumSha256: file.checksum,
      status: "QUARANTINED",
    },
  });
}

export async function getCommercialDocumentFormOptions(
  auth: AuthContext,
  rawType: string | null,
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const type = z.enum(["sale", "purchase"]).parse(rawType);
  return withAuthTransaction(auth, async (transaction) => {
    const [settings, assignments, companyVatOffering, rates] = await Promise.all([
      ensureCommercialSettings(transaction, auth, companyId),
      transaction.companyAccountingAssignment.findMany({
        where: { companyId },
        include: { account: { select: { id: true, code: true, name: true } } },
      }),
      transaction.companyOffering.findUnique({
        where: {
          companyId_kind_offeringKey: {
            companyId,
            kind: "TAX",
            offeringKey: "iva",
          },
        },
        select: { companyId: true },
      }),
      transaction.taxRate.findMany({
        where: {
          firmId: auth.firmId,
          active: true,
          offering: { key: "iva", kind: "TAX", active: true },
        },
        orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
      }),
    ]);
    return {
      type,
      nextSaleNumber:
        type === "sale"
          ? saleNumber(
              settings.salesInvoicePrefix,
              settings.nextSalesInvoiceNumber,
              settings.salesInvoicePadding,
            )
          : null,
      assignments: Object.fromEntries(
        assignments.map((assignment) => [
          assignment.roleKey,
          {
            id: assignment.account.id,
            label: accountLabel(assignment.account),
          },
        ]),
      ),
      vatEnabled: Boolean(companyVatOffering),
      vatRates: (companyVatOffering ? rates : []).map((rate) => ({
        id: rate.id,
        name: rate.name,
        rate: rate.rate.toString(),
        effectiveFrom: rate.effectiveFrom?.toISOString().slice(0, 10) ?? null,
        effectiveTo: rate.effectiveTo?.toISOString().slice(0, 10) ?? null,
        source: rate.source ?? "",
      })),
    };
  });
}

export async function listCommercialDocuments(
  auth: AuthContext,
  rawType: string | null,
) {
  const companyId = activeCompanyId(auth);
  const type = z.enum(["sale", "purchase"]).parse(rawType);
  return withAuthTransaction(auth, async (transaction) => {
    const documents = await transaction.commercialDocument.findMany({
      where: { companyId, type: databaseDocumentType[type] },
      include: {
        counterparty: { select: { legalName: true, rif: true } },
        invoiceAttachment: { select: { originalName: true, status: true } },
        retentions: {
          include: {
            attachment: { select: { originalName: true, status: true } },
          },
          orderBy: { type: "asc" },
        },
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    });
    return { documents: documents.map(serializeDocument) };
  });
}

export async function getCommercialDocument(
  auth: AuthContext,
  rawDocumentId: string,
) {
  const companyId = activeCompanyId(auth);
  const documentId = z.uuid().parse(rawDocumentId);
  return withAuthTransaction(auth, async (transaction) => {
    const document = await transaction.commercialDocument.findFirst({
      where: { id: documentId, companyId },
      include: {
        counterparty: { select: { id: true, legalName: true, rif: true } },
        invoiceAttachment: { select: { originalName: true, status: true } },
        items: { orderBy: { position: "asc" } },
        accountingEntries: {
          include: {
            account: {
              select: { id: true, code: true, name: true, nature: true },
            },
          },
          orderBy: { position: "asc" },
        },
        retentions: {
          include: {
            attachment: { select: { originalName: true, status: true } },
          },
          orderBy: { type: "asc" },
        },
      },
    });
    if (!document)
      throw new CommercialNotFoundError(
        "La factura no existe en la empresa activa.",
      );
    return {
      document: {
        ...serializeDocument(document),
        counterpartyId: document.counterpartyId,
        editable: document.status === "REGISTERED" && !document.declaredAt,
        items: document.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxable: item.taxable,
        })),
        accountingEntries: document.accountingEntries.map((entry) => ({
          id: entry.id,
          accountId: entry.accountId,
          account: accountLabel(entry.account),
          nature: entry.account.nature,
          debit: entry.debit.toString(),
          credit: entry.credit.toString(),
          source: entry.source,
        })),
      },
    };
  });
}

export async function updateCommercialDocument(
  auth: AuthContext,
  rawDocumentId: string,
  rawInput: unknown,
  uploads: CommercialUploads = {},
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const documentId = z.uuid().parse(rawDocumentId);
  const input = commercialDocumentInputSchema.parse(rawInput);
  const calculatedTotal = asDecimal(input.taxableBase)
    .plus(input.exemptAmount)
    .plus(input.nonTaxableAmount)
    .plus(input.taxAmount);
  if (!decimalClose(calculatedTotal, asDecimal(input.totalAmount)))
    throw new CommercialConflictError(
      "El total de la factura no coincide con sus bases e impuesto.",
    );
  if (input.type === "purchase" && input.items.length)
    throw new CommercialConflictError(
      "Los renglones detallados solo aplican al registro de ventas.",
    );
  if (input.type === "sale") {
    if (!input.items.length)
      throw new CommercialConflictError(
        "Agrega al menos un renglón a la factura de venta.",
      );
    const itemBases = input.items.reduce(
      (totals, item) => {
        const line = asDecimal(item.quantity).mul(item.unitPrice);
        totals[item.taxable ? "taxable" : "exempt"] =
          totals[item.taxable ? "taxable" : "exempt"].plus(line);
        return totals;
      },
      { taxable: new Prisma.Decimal(0), exempt: new Prisma.Decimal(0) },
    );
    if (
      !decimalClose(itemBases.taxable, asDecimal(input.taxableBase)) ||
      !decimalClose(itemBases.exempt, asDecimal(input.exemptAmount))
    )
      throw new CommercialConflictError(
        "Las bases no coinciden con los renglones de la factura.",
      );
  }
  const debit = input.accountingEntries.reduce(
    (sum, entry) => sum.plus(entry.debit),
    new Prisma.Decimal(0),
  );
  const credit = input.accountingEntries.reduce(
    (sum, entry) => sum.plus(entry.credit),
    new Prisma.Decimal(0),
  );
  if (!decimalClose(debit, credit) || debit.isZero())
    throw new CommercialConflictError(
      "El registro contable debe estar cuadrado.",
    );
  if (!decimalClose(debit, asDecimal(input.totalAmount)))
    throw new CommercialConflictError(
      "El asiento debe reconocer el total completo de la factura.",
    );

  const current = await withAuthTransaction(auth, (transaction) =>
    transaction.commercialDocument.findFirst({
      where: { id: documentId, companyId },
      include: { retentions: true },
    }),
  );
  if (!current)
    throw new CommercialNotFoundError(
      "La factura no existe en la empresa activa.",
    );
  if (current.status !== "REGISTERED" || current.declaredAt)
    throw new CommercialConflictError(
      "La factura ya fue declarada o anulada y no puede modificarse.",
    );
  if (current.type !== databaseDocumentType[input.type])
    throw new CommercialConflictError(
      "El tipo de la factura no puede modificarse.",
    );

  const prepared: PreparedUpload[] = [];
  try {
    const invoiceUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "invoice",
      uploads.invoice,
    );
    if (invoiceUpload) prepared.push(invoiceUpload);
    const ivaUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "retention-iva",
      uploads.retentionIVA,
    );
    if (ivaUpload) prepared.push(ivaUpload);
    const islrUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "retention-islr",
      uploads.retentionISLR,
    );
    if (islrUpload) prepared.push(islrUpload);

    return await withAuthTransaction(auth, async (transaction) => {
      const locked = await transaction.commercialDocument.findFirst({
        where: { id: documentId, companyId },
        include: { retentions: true },
      });
      if (!locked)
        throw new CommercialNotFoundError(
          "La factura no existe en la empresa activa.",
        );
      if (locked.status !== "REGISTERED" || locked.declaredAt)
        throw new CommercialConflictError(
          "La factura ya fue declarada o anulada y no puede modificarse.",
        );
      const issueDate = new Date(`${input.issueDate}T00:00:00.000Z`);
      const party = await transaction.commercialPartyRole.findFirst({
        where: {
          counterpartyId: input.counterpartyId,
          companyId,
          kind: input.type === "sale" ? "CUSTOMER" : "SUPPLIER",
          status: "ACTIVE",
          counterparty: { status: "ACTIVE" },
        },
      });
      if (!party)
        throw new CommercialNotFoundError(
          `Selecciona un ${input.type === "sale" ? "cliente" : "proveedor"} registrado y activo.`,
        );
      const accountIds = [
        ...new Set(input.accountingEntries.map((entry) => entry.accountId)),
      ];
      const validAccounts = await transaction.companyChartAccount.findMany({
        where: {
          companyId,
          id: { in: accountIds },
          status: "ACTIVE",
          acceptsMovements: true,
        },
        select: { id: true, nature: true },
      });
      if (validAccounts.length !== accountIds.length)
        throw new CommercialConflictError(
          "El asiento contiene una cuenta que no pertenece al plan activo de la empresa.",
        );
      const natureByAccount = new Map(
        validAccounts.map((account) => [account.id, account.nature]),
      );
      if (
        input.accountingEntries.some((entry) =>
          natureByAccount.get(entry.accountId) === "DEBIT"
            ? asDecimal(entry.debit).isZero() ||
              !asDecimal(entry.credit).isZero()
            : asDecimal(entry.credit).isZero() ||
              !asDecimal(entry.debit).isZero(),
        )
      )
        throw new CommercialConflictError(
          "Cada monto del asiento debe respetar la naturaleza de su cuenta contable.",
        );

      const taxAmount = asDecimal(input.taxAmount);
      const hasTax = taxAmount.greaterThan(0);
      const rate = hasTax
        ? await configuredVatRate(transaction, auth, companyId, issueDate)
        : null;
      if (hasTax && !rate)
        throw new CommercialConflictError(
          "No existe una alícuota de IVA activa, con fuente y vigencia, para la fecha indicada.",
        );
      if (rate) {
        const expectedTax = asDecimal(input.taxableBase)
          .mul(rate.rate)
          .div(100);
        if (!decimalClose(expectedTax, taxAmount))
          throw new CommercialConflictError(
            "El IVA no coincide con la alícuota vigente para la fecha de la factura.",
          );
        const mustUseVatAccount = input.type === "sale" || input.hasVatCredit;
        const roleKey = input.type === "sale" ? "iva-debit" : "iva-credit";
        const assignment = mustUseVatAccount
          ? await transaction.companyAccountingAssignment.findUnique({
              where: { companyId_roleKey: { companyId, roleKey } },
            })
          : null;
        const taxEntry = assignment
          ? input.accountingEntries.find(
              (entry) =>
                entry.accountId === assignment.accountId &&
                decimalClose(
                  asDecimal(input.type === "sale" ? entry.credit : entry.debit),
                  taxAmount,
                ),
            )
          : null;
        if (mustUseVatAccount && (!assignment || !taxEntry))
          throw new CommercialConflictError(
            "El IVA debe registrarse en la cuenta configurada para la empresa.",
          );
      }

      const invoiceStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        invoiceUpload,
      );
      const ivaStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        ivaUpload,
      );
      const islrStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        islrUpload,
      );
      const existingAttachment = Object.fromEntries(
        locked.retentions.map((retention) => [
          retention.type,
          retention.attachmentId,
        ]),
      );
      const attachmentByType = {
        IVA: ivaStored?.id ?? existingAttachment.IVA ?? null,
        ISLR: islrStored?.id ?? existingAttachment.ISLR ?? null,
      };
      await transaction.commercialDocumentItem.deleteMany({
        where: { documentId },
      });
      await transaction.commercialAccountingEntry.deleteMany({
        where: { documentId },
      });
      await transaction.commercialRetention.deleteMany({
        where: { documentId },
      });
      const documentNumber =
        input.type === "sale" ? locked.documentNumber : input.documentNumber;
      const document = await transaction.commercialDocument.update({
        where: { id: documentId },
        data: {
          counterpartyId: input.counterpartyId,
          documentNumber,
          normalizedDocumentNumber: normalizeDocumentNumber(documentNumber),
          issueDate,
          impositionPeriod: input.issueDate.slice(0, 7),
          currencyCode: input.currencyCode,
          taxableBase: input.taxableBase,
          exemptAmount: input.exemptAmount,
          nonTaxableAmount: input.nonTaxableAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          vatRate: rate?.rate ?? null,
          vatSource: rate?.source ?? null,
          taxRateId: rate?.id ?? null,
          vatCreditStatus:
            input.type === "purchase" && hasTax
              ? input.hasVatCredit
                ? "PENDING"
                : "EXCLUDED"
              : null,
          invoiceAttachmentId: invoiceStored?.id ?? locked.invoiceAttachmentId,
          version: { increment: 1 },
          items: {
            create: input.items.map((item, index) => ({
              position: index + 1,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxable: item.taxable,
              lineTotal: asDecimal(item.quantity).mul(item.unitPrice),
            })),
          },
          accountingEntries: {
            create: input.accountingEntries.map((entry, index) => ({
              firmId: auth.firmId,
              companyId,
              accountId: entry.accountId,
              position: index + 1,
              debit: entry.debit,
              credit: entry.credit,
              source: entry.source,
            })),
          },
          retentions: {
            create: input.retentions.map((retention) => ({
              firmId: auth.firmId,
              companyId,
              type: retention.type,
              receiptNumber: retention.receiptNumber,
              normalizedReceiptNumber: normalizeDocumentNumber(
                retention.receiptNumber,
              ),
              issueDate: new Date(`${retention.issueDate}T00:00:00.000Z`),
              percentage: retention.percentage || null,
              amount: retention.amount,
              attachmentId: attachmentByType[retention.type],
            })),
          },
        },
        include: {
          counterparty: { select: { legalName: true, rif: true } },
          invoiceAttachment: { select: { originalName: true, status: true } },
          retentions: {
            include: {
              attachment: { select: { originalName: true, status: true } },
            },
          },
        },
      });
      await audit(
        transaction,
        auth,
        "commercial.document.updated",
        "commercial_document",
        document.id,
        {
          companyId,
          type: input.type,
          documentNumber,
          impositionPeriod: document.impositionPeriod,
        },
      );
      return serializeDocument(document);
    });
  } catch (error) {
    await Promise.all(
      prepared.map((file) =>
        deletePrivateObject(file.key).catch(() => undefined),
      ),
    );
    if (
      error instanceof CommercialConflictError ||
      error instanceof CommercialNotFoundError
    )
      throw error;
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new CommercialConflictError(
        "Ya existe una factura con ese número para la contraparte seleccionada.",
      );
    throw error;
  }
}

export async function createCommercialDocument(
  auth: AuthContext,
  rawInput: unknown,
  uploads: CommercialUploads = {},
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const input = commercialDocumentInputSchema.parse(rawInput);
  const calculatedTotal = asDecimal(input.taxableBase)
    .plus(input.exemptAmount)
    .plus(input.nonTaxableAmount)
    .plus(input.taxAmount);
  if (!decimalClose(calculatedTotal, asDecimal(input.totalAmount)))
    throw new CommercialConflictError(
      "El total de la factura no coincide con sus bases e impuesto.",
    );
  if (input.type === "purchase" && input.items.length)
    throw new CommercialConflictError(
      "Los renglones detallados solo aplican al registro de ventas.",
    );
  if (input.type === "sale") {
    if (!asDecimal(input.nonTaxableAmount).isZero())
      throw new CommercialConflictError(
        "Los importes no gravados no aplican al detalle actual de ventas.",
      );
    if (!input.items.length)
      throw new CommercialConflictError(
        "Agrega al menos un renglón a la factura de venta.",
      );
    const itemBases = input.items.reduce(
      (totals, item) => {
        const line = asDecimal(item.quantity).mul(item.unitPrice);
        totals[item.taxable ? "taxable" : "exempt"] =
          totals[item.taxable ? "taxable" : "exempt"].plus(line);
        return totals;
      },
      { taxable: new Prisma.Decimal(0), exempt: new Prisma.Decimal(0) },
    );
    if (
      !decimalClose(itemBases.taxable, asDecimal(input.taxableBase)) ||
      !decimalClose(itemBases.exempt, asDecimal(input.exemptAmount))
    )
      throw new CommercialConflictError(
        "Las bases no coinciden con los renglones de la factura.",
      );
  }

  const debit = input.accountingEntries.reduce(
    (sum, entry) => sum.plus(entry.debit),
    new Prisma.Decimal(0),
  );
  const credit = input.accountingEntries.reduce(
    (sum, entry) => sum.plus(entry.credit),
    new Prisma.Decimal(0),
  );
  if (!decimalClose(debit, credit) || debit.isZero())
    throw new CommercialConflictError(
      "El registro contable debe estar cuadrado.",
    );
  if (!decimalClose(debit, asDecimal(input.totalAmount)))
    throw new CommercialConflictError(
      "El asiento debe reconocer el total completo de la factura.",
    );
  if (input.retentions.length && input.type !== "sale")
    throw new CommercialConflictError(
      "Las retenciones recibidas solo pueden vincularse a una venta.",
    );

  const documentId = randomUUID();
  const prepared: PreparedUpload[] = [];
  try {
    const invoiceUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "invoice",
      uploads.invoice,
    );
    if (invoiceUpload) prepared.push(invoiceUpload);
    const ivaUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "retention-iva",
      uploads.retentionIVA,
    );
    if (ivaUpload) prepared.push(ivaUpload);
    const islrUpload = await prepareUpload(
      auth,
      companyId,
      documentId,
      "retention-islr",
      uploads.retentionISLR,
    );
    if (islrUpload) prepared.push(islrUpload);

    return await withAuthTransaction(auth, async (transaction) => {
      const issueDate = new Date(`${input.issueDate}T00:00:00.000Z`);
      const role = await transaction.commercialPartyRole.findFirst({
        where: {
          counterpartyId: input.counterpartyId,
          companyId,
          kind: input.type === "sale" ? "CUSTOMER" : "SUPPLIER",
          status: "ACTIVE",
          counterparty: { status: "ACTIVE" },
        },
      });
      if (!role)
        throw new CommercialNotFoundError(
          `Selecciona un ${input.type === "sale" ? "cliente" : "proveedor"} registrado y activo.`,
        );

      const accountIds = [
        ...new Set(input.accountingEntries.map((entry) => entry.accountId)),
      ];
      const validAccounts = await transaction.companyChartAccount.findMany({
        where: {
          companyId,
          id: { in: accountIds },
          status: "ACTIVE",
          acceptsMovements: true,
        },
        select: { id: true, nature: true },
      });
      if (validAccounts.length !== accountIds.length)
        throw new CommercialConflictError(
          "El asiento contiene una cuenta que no pertenece al plan activo de la empresa.",
        );
      const natureByAccount = new Map(
        validAccounts.map((account) => [account.id, account.nature]),
      );
      const wrongNature = input.accountingEntries.some((entry) => {
        const nature = natureByAccount.get(entry.accountId);
        return nature === "DEBIT"
          ? asDecimal(entry.debit).isZero() || !asDecimal(entry.credit).isZero()
          : asDecimal(entry.credit).isZero() ||
              !asDecimal(entry.debit).isZero();
      });
      if (wrongNature)
        throw new CommercialConflictError(
          "Cada monto del asiento debe respetar la naturaleza de su cuenta contable.",
        );

      const taxAmount = asDecimal(input.taxAmount);
      const hasTax = taxAmount.greaterThan(0);
      const rate = hasTax
        ? await configuredVatRate(transaction, auth, companyId, issueDate)
        : null;
      if (hasTax && !rate)
        throw new CommercialConflictError(
          "No existe una alícuota de IVA activa, con fuente y vigencia, para la fecha indicada.",
        );
      if (rate) {
        if (!rate.source?.trim() || !rate.effectiveFrom)
          throw new CommercialConflictError(
            "La alícuota de IVA activa debe conservar fuente y fecha de vigencia antes de usarse.",
          );
        const expectedTax = asDecimal(input.taxableBase)
          .mul(rate.rate)
          .div(100);
        if (!decimalClose(expectedTax, taxAmount))
          throw new CommercialConflictError(
            "El IVA no coincide con la alícuota vigente para la fecha de la factura.",
          );
        const mustUseVatAccount = input.type === "sale" || input.hasVatCredit;
        const roleKey = input.type === "sale" ? "iva-debit" : "iva-credit";
        const assignment = mustUseVatAccount
          ? await transaction.companyAccountingAssignment.findUnique({
              where: { companyId_roleKey: { companyId, roleKey } },
            })
          : null;
        if (mustUseVatAccount && !assignment)
          throw new CommercialConflictError(
            `Configura la cuenta de ${input.type === "sale" ? "IVA débito fiscal" : "IVA crédito fiscal"} en Plan de cuentas → Asignaciones contables.`,
          );
        const taxEntry = assignment
          ? input.accountingEntries.find(
              (entry) =>
                entry.accountId === assignment.accountId &&
                decimalClose(
                  asDecimal(input.type === "sale" ? entry.credit : entry.debit),
                  taxAmount,
                ),
            )
          : null;
        if (mustUseVatAccount && !taxEntry)
          throw new CommercialConflictError(
            "El IVA debe registrarse en la cuenta configurada para la empresa.",
          );
      }

      for (const retention of input.retentions) {
        if (
          retention.type === "IVA" &&
          !/^\d{15}$/.test(retention.receiptNumber)
        )
          throw new CommercialConflictError(
            "El comprobante de retención de IVA debe contener 15 dígitos.",
          );
        if (
          retention.type === "IVA" &&
          asDecimal(retention.amount).greaterThan(taxAmount)
        )
          throw new CommercialConflictError(
            "La retención de IVA no puede exceder el IVA de la factura.",
          );
      }

      const allocated =
        input.type === "sale"
          ? await allocateSaleNumber(transaction, auth, companyId)
          : null;
      const documentNumber = allocated?.documentNumber ?? input.documentNumber;
      const invoiceStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        invoiceUpload,
      );
      const ivaStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        ivaUpload,
      );
      const islrStored = await createStoredObject(
        transaction,
        auth,
        companyId,
        islrUpload,
      );
      const attachmentByType = { IVA: ivaStored, ISLR: islrStored };
      const document = await transaction.commercialDocument.create({
        data: {
          id: documentId,
          firmId: auth.firmId,
          companyId,
          counterpartyId: input.counterpartyId,
          type: databaseDocumentType[input.type],
          documentNumber,
          normalizedDocumentNumber: normalizeDocumentNumber(documentNumber),
          sequenceNumber: allocated?.sequenceNumber ?? null,
          issueDate,
          impositionPeriod: input.issueDate.slice(0, 7),
          currencyCode: input.currencyCode,
          taxableBase: input.taxableBase,
          exemptAmount: input.exemptAmount,
          nonTaxableAmount: input.nonTaxableAmount,
          taxAmount: input.taxAmount,
          totalAmount: input.totalAmount,
          vatRate: rate?.rate ?? null,
          vatSource: rate?.source ?? null,
          taxRateId: rate?.id ?? null,
          vatCreditStatus:
            input.type === "purchase" && hasTax
              ? input.hasVatCredit
                ? "PENDING"
                : "EXCLUDED"
              : null,
          invoiceAttachmentId: invoiceStored?.id ?? null,
          items: {
            create: input.items.map((item, index) => ({
              position: index + 1,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxable: item.taxable,
              lineTotal: asDecimal(item.quantity).mul(item.unitPrice),
            })),
          },
          accountingEntries: {
            create: input.accountingEntries.map((entry, index) => ({
              firmId: auth.firmId,
              companyId,
              accountId: entry.accountId,
              position: index + 1,
              debit: entry.debit,
              credit: entry.credit,
              source: entry.source,
            })),
          },
          retentions: {
            create: input.retentions.map((retention) => ({
              firmId: auth.firmId,
              companyId,
              type: retention.type,
              receiptNumber: retention.receiptNumber,
              normalizedReceiptNumber: normalizeDocumentNumber(
                retention.receiptNumber,
              ),
              issueDate: new Date(`${retention.issueDate}T00:00:00.000Z`),
              percentage: retention.percentage || null,
              amount: retention.amount,
              attachmentId: attachmentByType[retention.type]?.id ?? null,
            })),
          },
        },
        include: {
          counterparty: { select: { legalName: true, rif: true } },
          invoiceAttachment: { select: { originalName: true, status: true } },
          retentions: {
            include: {
              attachment: { select: { originalName: true, status: true } },
            },
          },
        },
      });
      await audit(
        transaction,
        auth,
        "commercial.document.registered",
        "commercial_document",
        document.id,
        {
          companyId,
          type: input.type,
          counterpartyId: input.counterpartyId,
          documentNumber,
          impositionPeriod: document.impositionPeriod,
          retentionTypes: input.retentions.map((retention) => retention.type),
        },
      );
      return serializeDocument(document);
    });
  } catch (error) {
    await Promise.all(
      prepared.map((file) =>
        deletePrivateObject(file.key).catch(() => undefined),
      ),
    );
    if (
      error instanceof CommercialConflictError ||
      error instanceof CommercialNotFoundError
    )
      throw error;
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new CommercialConflictError(
        input.type === "purchase"
          ? "Ya existe una factura con ese número para el proveedor seleccionado."
          : "El correlativo de venta ya fue utilizado. Recarga el formulario para continuar.",
      );
    throw error;
  }
}

export async function voidNextSalesInvoice(
  auth: AuthContext,
  rawInput: unknown,
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const input = z
    .object({
      issueDate: z.iso.date(),
      reason: z.string().trim().min(5).max(500),
    })
    .parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const allocated = await allocateSaleNumber(transaction, auth, companyId);
    const document = await transaction.commercialDocument.create({
      data: {
        firmId: auth.firmId,
        companyId,
        type: "SALE",
        documentNumber: allocated.documentNumber,
        normalizedDocumentNumber: normalizeDocumentNumber(
          allocated.documentNumber,
        ),
        sequenceNumber: allocated.sequenceNumber,
        issueDate: new Date(`${input.issueDate}T00:00:00.000Z`),
        impositionPeriod: input.issueDate.slice(0, 7),
        currencyCode: "VES",
        taxableBase: 0,
        exemptAmount: 0,
        nonTaxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: "VOIDED",
        voidReason: input.reason,
      },
    });
    await audit(
      transaction,
      auth,
      "commercial.sale_number.voided",
      "commercial_document",
      document.id,
      {
        companyId,
        documentNumber: document.documentNumber,
        reason: input.reason,
      },
    );
    return serializeDocument(document);
  });
}

export async function voidCommercialDocument(
  auth: AuthContext,
  rawDocumentId: string,
  rawReason: string,
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const documentId = z.uuid().parse(rawDocumentId);
  const reason = z.string().trim().min(5).max(500).parse(rawReason);

  return withAuthTransaction(auth, async (transaction) => {
    const document = await transaction.commercialDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!document) {
      throw new CommercialNotFoundError(
        "La factura no existe en la empresa activa.",
      );
    }

    if (document.status === "VOIDED") {
      throw new CommercialConflictError("El documento ya se encuentra anulado.");
    }

    if (document.status === "DECLARED") {
      throw new CommercialConflictError("No es posible anular un documento declarado.");
    }

    await transaction.commercialDocumentItem.deleteMany({
      where: { documentId },
    });
    await transaction.commercialAccountingEntry.deleteMany({
      where: { documentId },
    });
    await transaction.commercialRetention.deleteMany({
      where: { documentId },
    });

    const updated = await transaction.commercialDocument.update({
      where: { id: documentId },
      data: {
        status: "VOIDED",
        voidReason: reason,
        counterpartyId: null,
        taxableBase: 0,
        exemptAmount: 0,
        nonTaxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        vatRate: null,
        vatSource: null,
        taxRateId: null,
      },
    });

    await audit(
      transaction,
      auth,
      "commercial.sale_number.voided",
      "commercial_document",
      updated.id,
      {
        companyId,
        documentNumber: updated.documentNumber,
        reason,
      },
    );

    return serializeDocument(updated);
  });
}

export async function deleteCommercialDocument(
  auth: AuthContext,
  rawDocumentId: string,
) {
  requirePermission(auth, permissions.commercialDocumentsManage);
  const companyId = activeCompanyId(auth);
  const documentId = z.uuid().parse(rawDocumentId);

  return withAuthTransaction(auth, async (transaction) => {
    const document = await transaction.commercialDocument.findFirst({
      where: { id: documentId, companyId },
      include: {
        invoiceAttachment: true,
        retentions: { include: { attachment: true } },
        ivaDeclarations: true,
      },
    });

    if (!document) {
      throw new CommercialNotFoundError(
        "La factura no existe en la empresa activa.",
      );
    }



    if (
      (document.status !== "REGISTERED" && document.status !== "VOIDED") ||
      document.declaredAt ||
      document.ivaDeclarations.length > 0
    ) {
      throw new CommercialConflictError(
        "El documento ya fue declarado en el IVA y no puede ser eliminado.",
      );
    }

    const attachmentKeys: string[] = [];
    if (document.invoiceAttachment?.objectKey) {
      attachmentKeys.push(document.invoiceAttachment.objectKey);
    }
    for (const retention of document.retentions) {
      if (retention.attachment?.objectKey) {
        attachmentKeys.push(retention.attachment.objectKey);
      }
    }

    await transaction.commercialDocumentItem.deleteMany({
      where: { documentId },
    });
    await transaction.commercialAccountingEntry.deleteMany({
      where: { documentId },
    });
    await transaction.commercialRetention.deleteMany({
      where: { documentId },
    });

    const attachmentIds = [
      document.invoiceAttachmentId,
      ...document.retentions.map((r) => r.attachmentId),
    ].filter((id): id is string => Boolean(id));

    await transaction.commercialDocument.delete({
      where: { id: documentId },
    });

    if (attachmentIds.length > 0) {
      await transaction.storedObject.deleteMany({
        where: { id: { in: attachmentIds } },
      });
    }

    await audit(
      transaction,
      auth,
      "commercial.document.deleted",
      "commercial_document",
      documentId,
      {
        companyId,
        type: routeDocumentType[document.type],
        documentNumber: document.documentNumber,
        impositionPeriod: document.impositionPeriod,
      },
    );

    await Promise.all(
      attachmentKeys.map((key) =>
        deletePrivateObject(key).catch(() => undefined),
      ),
    );

    return { success: true };
  });
}

