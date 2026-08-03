import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const supportedRoles = new Set([
  "iva-debit", "iva-credit", "iva-payable", "iva-bank",
  "municipal-expense", "municipal-payable", "municipal-bank",
  "inces-expense", "inces-payable", "inces-bank",
  "electricity-expense", "electricity-payable", "water-expense", "water-payable",
]);

const inputSchema = z.object({
  assignments: z.record(z.string(), z.union([z.uuid(), z.literal("")])),
  salesInvoicePrefix: z.string().trim().max(12),
  nextSalesInvoiceNumber: z.number().int().positive().max(999_999_999),
  salesInvoicePadding: z.number().int().min(1).max(12),
  version: z.number().int().positive(),
});

function activeCompanyId(auth: AuthContext) {
  requirePermission(auth, permissions.chartAccountsRead);
  if (!auth.activeCompanyId || !auth.allowedCompanyIds.includes(auth.activeCompanyId)) throw new AuthorizationError("Selecciona una empresa activa autorizada.");
  return auth.activeCompanyId;
}

function numberLabel(prefix: string, next: number, padding: number) {
  return `${prefix}${String(next).padStart(padding, "0")}`;
}

async function ensureSettings(transaction: Prisma.TransactionClient, auth: AuthContext, companyId: string) {
  return transaction.companyCommercialSettings.upsert({ where: { companyId }, create: { firmId: auth.firmId, companyId }, update: {} });
}

export async function getCommercialAccountingConfiguration(auth: AuthContext) {
  const companyId = activeCompanyId(auth);
  return withAuthTransaction(auth, async (transaction) => {
    const [settings, assignments, accounts] = await Promise.all([
      ensureSettings(transaction, auth, companyId),
      transaction.companyAccountingAssignment.findMany({ where: { companyId } }),
      transaction.companyChartAccount.findMany({
        where: { companyId, status: "ACTIVE", acceptsMovements: true },
        select: { id: true, code: true, name: true, status: true, acceptsMovements: true },
        orderBy: { code: "asc" },
      }),
    ]);
    return {
      assignments: Object.fromEntries(assignments.map((assignment) => [assignment.roleKey, assignment.accountId])),
      accounts: accounts.map((account) => ({ id: account.id, code: account.code, name: account.name, label: `${account.code} · ${account.name}` })),
      settings: {
        salesInvoicePrefix: settings.salesInvoicePrefix,
        nextSalesInvoiceNumber: settings.nextSalesInvoiceNumber,
        salesInvoicePadding: settings.salesInvoicePadding,
        nextSalesInvoiceLabel: numberLabel(settings.salesInvoicePrefix, settings.nextSalesInvoiceNumber, settings.salesInvoicePadding),
        version: settings.version,
      },
      canManage: auth.permissionKeys.includes(permissions.chartAccountsManage),
    };
  });
}

export async function updateCommercialAccountingConfiguration(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.chartAccountsManage);
  const companyId = activeCompanyId(auth);
  const input = inputSchema.parse(rawInput);
  const entries = Object.entries(input.assignments);
  if (entries.some(([roleKey]) => !supportedRoles.has(roleKey))) throw new Error("La asignación contable indicada no está soportada.");
  await withAuthTransaction(auth, async (transaction) => {
    const settings = await ensureSettings(transaction, auth, companyId);
    if (settings.version !== input.version) throw new Error("La configuración cambió en otra sesión. Recarga antes de guardar.");
    const accountIds = [...new Set(entries.map(([, accountId]) => accountId).filter(Boolean))];
    const count = await transaction.companyChartAccount.count({ where: { companyId, id: { in: accountIds }, status: "ACTIVE", acceptsMovements: true } });
    if (count !== accountIds.length) throw new Error("Una cuenta asignada no pertenece al plan activo de la empresa.");

    const nextLabel = numberLabel(input.salesInvoicePrefix, input.nextSalesInvoiceNumber, input.salesInvoicePadding).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const used = await transaction.commercialDocument.count({ where: { companyId, type: "SALE", normalizedDocumentNumber: nextLabel } });
    if (used) throw new Error("El correlativo inicial ya fue utilizado o anulado. Indica el siguiente número disponible.");

    for (const [roleKey, accountId] of entries) {
      if (accountId) await transaction.companyAccountingAssignment.upsert({
          where: { companyId_roleKey: { companyId, roleKey } },
          create: { firmId: auth.firmId, companyId, roleKey, accountId },
          update: { accountId, version: { increment: 1 } },
        });
      else await transaction.companyAccountingAssignment.deleteMany({ where: { companyId, roleKey } });
    }
    await transaction.companyCommercialSettings.update({
      where: { id: settings.id },
      data: {
        salesInvoicePrefix: input.salesInvoicePrefix,
        nextSalesInvoiceNumber: input.nextSalesInvoiceNumber,
        salesInvoicePadding: input.salesInvoicePadding,
        version: { increment: 1 },
      },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "company.commercial_accounting_configuration.updated",
        entityType: "company",
        entityId: companyId,
        metadata: { assignmentRoles: entries.filter(([, value]) => value).map(([key]) => key), nextSalesInvoice: numberLabel(input.salesInvoicePrefix, input.nextSalesInvoiceNumber, input.salesInvoicePadding) },
      },
    });
  });
  return getCommercialAccountingConfiguration(auth);
}
