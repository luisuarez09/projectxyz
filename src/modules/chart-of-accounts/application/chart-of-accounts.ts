import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import firmBaseAccounts from "@/data/firm-base-chart-of-accounts.json";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import {
  accountInputSchema,
  accountTypeToDatabase,
  accountUpdateSchema,
  serializeAccount,
  toDatabaseAccount,
} from "@/modules/chart-of-accounts/domain/chart-of-accounts";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const templateSourceName = "plan_de_cuentas_detallado_empresa_comercial_venezuela_ISLR.xlsx";

function assertFirmTemplateManagement(auth: AuthContext) {
  if (!auth.firmScope) throw new AuthorizationError("La plantilla base requiere acceso a toda la firma.");
  requirePermission(auth, permissions.firmChartTemplateManage);
}

function activeCompanyId(auth: AuthContext) {
  requirePermission(auth, permissions.chartAccountsRead);
  if (!auth.activeCompanyId || !auth.allowedCompanyIds.includes(auth.activeCompanyId)) {
    throw new AuthorizationError("Selecciona una empresa activa autorizada.");
  }
  return auth.activeCompanyId;
}

function assertCompanyManagement(auth: AuthContext) {
  requirePermission(auth, permissions.chartAccountsManage);
  return activeCompanyId(auth);
}

function defaultTemplateAccounts() {
  return firmBaseAccounts.map((account) => ({
    code: account.code.trim(),
    name: account.name.trim(),
    type: accountTypeToDatabase[account.type as keyof typeof accountTypeToDatabase],
    nature: account.nature === "Deudora" ? "DEBIT" as const : "CREDIT" as const,
    level: Number(account.level),
    parent: account.parent.trim() || "Sin cuenta superior",
    use: account.use.trim(),
    acceptsMovements: account.acceptsMovements,
    status: account.status === "Inactiva" ? "INACTIVE" as const : "ACTIVE" as const,
  }));
}

async function ensureFirmTemplate(transaction: Prisma.TransactionClient, auth: AuthContext) {
  const existing = await transaction.firmChartTemplate.findUnique({ where: { firmId: auth.firmId } });
  if (existing) return existing;

  const template = await transaction.firmChartTemplate.create({
    data: {
      firmId: auth.firmId,
      name: "Comercial genérico",
      description: "Plan de cuentas base editable de la firma para empresas comerciales.",
      sourceName: templateSourceName,
    },
  });
  const accounts = defaultTemplateAccounts();
  await transaction.firmChartTemplateAccount.createMany({
    data: accounts.map((account) => ({ templateId: template.id, ...account })),
  });
  await transaction.auditEvent.create({
    data: {
      firmId: auth.firmId,
      actorUserId: auth.userId,
      requestId: randomUUID(),
      eventType: "firm.chart_template.initialized",
      entityType: "firm_chart_template",
      entityId: template.id,
      metadata: { accounts: accounts.length, sourceName: templateSourceName },
    },
  });
  return template;
}

function duplicateCodeError(error: unknown): never {
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
    throw new Error("Ya existe una cuenta con ese código.");
  }
  throw error;
}

export async function getFirmChartTemplate(auth: AuthContext) {
  assertFirmTemplateManagement(auth);
  return withAuthTransaction(auth, async (transaction) => {
    const template = await ensureFirmTemplate(transaction, auth);
    const accounts = await transaction.firmChartTemplateAccount.findMany({
      where: { templateId: template.id },
      orderBy: [{ code: "asc" }],
    });
    return {
      template: {
        id: template.id,
        version: template.version,
        name: template.name,
        description: template.description ?? "",
        sourceName: template.sourceName ?? "",
      },
      accounts: accounts.map(serializeAccount),
      canManage: true,
    };
  });
}

export async function createFirmTemplateAccount(auth: AuthContext, rawInput: unknown) {
  assertFirmTemplateManagement(auth);
  const input = accountInputSchema.parse(rawInput);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const template = await ensureFirmTemplate(transaction, auth);
      const account = await transaction.firmChartTemplateAccount.create({
        data: { templateId: template.id, ...toDatabaseAccount(input) },
      });
      await transaction.firmChartTemplate.update({ where: { id: template.id }, data: { version: { increment: 1 } } });
      await transaction.auditEvent.create({
        data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "firm.chart_template.account.created", entityType: "firm_chart_template_account", entityId: account.id, metadata: { code: account.code } },
      });
      return serializeAccount(account);
    });
  } catch (error) { return duplicateCodeError(error); }
}

export async function updateFirmTemplateAccount(auth: AuthContext, accountId: string, rawInput: unknown) {
  assertFirmTemplateManagement(auth);
  const input = accountUpdateSchema.parse(rawInput);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const template = await ensureFirmTemplate(transaction, auth);
      const result = await transaction.firmChartTemplateAccount.updateMany({
        where: { id: accountId, templateId: template.id, version: input.version },
        data: { ...toDatabaseAccount(input), version: { increment: 1 } },
      });
      if (result.count !== 1) throw new Error("La cuenta cambió en otra sesión. Recarga antes de guardar.");
      const account = await transaction.firmChartTemplateAccount.findUniqueOrThrow({ where: { id: accountId } });
      await transaction.firmChartTemplate.update({ where: { id: template.id }, data: { version: { increment: 1 } } });
      await transaction.auditEvent.create({
        data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "firm.chart_template.account.updated", entityType: "firm_chart_template_account", entityId: account.id, metadata: { code: account.code, version: account.version } },
      });
      return serializeAccount(account);
    });
  } catch (error) { return duplicateCodeError(error); }
}

export async function deleteFirmTemplateAccount(auth: AuthContext, accountId: string) {
  assertFirmTemplateManagement(auth);
  return withAuthTransaction(auth, async (transaction) => {
    const template = await ensureFirmTemplate(transaction, auth);
    const account = await transaction.firmChartTemplateAccount.findFirstOrThrow({ where: { id: accountId, templateId: template.id } });
    await transaction.firmChartTemplateAccount.delete({ where: { id: account.id } });
    await transaction.firmChartTemplate.update({ where: { id: template.id }, data: { version: { increment: 1 } } });
    await transaction.auditEvent.create({
      data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "firm.chart_template.account.deleted", entityType: "firm_chart_template_account", entityId: account.id, metadata: { code: account.code } },
    });
    return { id: account.id, deleted: true };
  });
}

export async function getCompanyChartOfAccounts(auth: AuthContext) {
  const companyId = activeCompanyId(auth);
  return withAuthTransaction(auth, async (transaction) => {
    const [company, accounts, template] = await Promise.all([
      transaction.company.findFirstOrThrow({ where: { id: companyId, status: "ACTIVE" }, select: { id: true, legalName: true } }),
      transaction.companyChartAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
      transaction.firmChartTemplate.findUnique({ where: { firmId: auth.firmId }, select: { name: true, _count: { select: { accounts: true } } } }),
    ]);
    return {
      company,
      accounts: accounts.map(serializeAccount),
      canManage: auth.permissionKeys.includes(permissions.chartAccountsManage),
      canApplyTemplate: auth.firmScope && auth.permissionKeys.includes(permissions.chartAccountsManage),
      template: { name: template?.name ?? "Comercial genérico", accountCount: template?._count.accounts ?? firmBaseAccounts.length },
    };
  });
}

export async function createCompanyChartAccount(auth: AuthContext, rawInput: unknown) {
  const companyId = assertCompanyManagement(auth);
  const input = accountInputSchema.parse(rawInput);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const account = await transaction.companyChartAccount.create({ data: { firmId: auth.firmId, companyId, ...toDatabaseAccount(input) } });
      await transaction.auditEvent.create({ data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "company.chart_account.created", entityType: "company_chart_account", entityId: account.id, metadata: { companyId, code: account.code } } });
      return serializeAccount(account);
    });
  } catch (error) { return duplicateCodeError(error); }
}

export async function updateCompanyChartAccount(auth: AuthContext, accountId: string, rawInput: unknown) {
  const companyId = assertCompanyManagement(auth);
  const input = accountUpdateSchema.parse(rawInput);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      const result = await transaction.companyChartAccount.updateMany({ where: { id: accountId, companyId, firmId: auth.firmId, version: input.version }, data: { ...toDatabaseAccount(input), version: { increment: 1 } } });
      if (result.count !== 1) throw new Error("La cuenta cambió en otra sesión. Recarga antes de guardar.");
      const account = await transaction.companyChartAccount.findUniqueOrThrow({ where: { id: accountId } });
      await transaction.auditEvent.create({ data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "company.chart_account.updated", entityType: "company_chart_account", entityId: account.id, metadata: { companyId, code: account.code, version: account.version } } });
      return serializeAccount(account);
    });
  } catch (error) { return duplicateCodeError(error); }
}

export async function deleteCompanyChartAccount(auth: AuthContext, accountId: string) {
  const companyId = assertCompanyManagement(auth);
  return withAuthTransaction(auth, async (transaction) => {
    const account = await transaction.companyChartAccount.findFirstOrThrow({ where: { id: accountId, companyId, firmId: auth.firmId } });
    await transaction.companyChartAccount.delete({ where: { id: account.id } });
    await transaction.auditEvent.create({ data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "company.chart_account.deleted", entityType: "company_chart_account", entityId: account.id, metadata: { companyId, code: account.code } } });
    return { id: account.id, deleted: true };
  });
}

export async function applyFirmChartTemplate(auth: AuthContext) {
  const companyId = assertCompanyManagement(auth);
  if (!auth.firmScope) throw new AuthorizationError("Aplicar la plantilla base requiere acceso a toda la firma.");
  return withAuthTransaction(auth, async (transaction) => {
    const template = await ensureFirmTemplate(transaction, auth);
    const [templateAccounts, existing] = await Promise.all([
      transaction.firmChartTemplateAccount.findMany({ where: { templateId: template.id } }),
      transaction.companyChartAccount.findMany({ where: { companyId }, select: { code: true } }),
    ]);
    const codes = new Set(existing.map(({ code }) => code));
    const missing = templateAccounts.filter((account) => !codes.has(account.code));
    if (missing.length) await transaction.companyChartAccount.createMany({
      data: missing.map(({ id, createdAt: _createdAt, updatedAt: _updatedAt, version: _version, templateId: _templateId, ...account }) => ({ firmId: auth.firmId, companyId, sourceTemplateAccountId: id, ...account })),
      skipDuplicates: true,
    });
    await transaction.auditEvent.create({ data: { firmId: auth.firmId, actorUserId: auth.userId, requestId: randomUUID(), eventType: "company.chart_template.applied", entityType: "company", entityId: companyId, metadata: { templateId: template.id, addedAccounts: missing.length } } });
    const accounts = await transaction.companyChartAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    return { addedAccounts: missing.length, accounts: accounts.map(serializeAccount) };
  });
}
