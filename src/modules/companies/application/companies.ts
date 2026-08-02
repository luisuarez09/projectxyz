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

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null);
const nullableEmail = z
  .union([z.literal(""), z.email()])
  .transform((value) => value || null);
const nullableDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "La fecha no es válida.",
  )
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));

const branchSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  code: nullableText(40),
  address: z.string().trim().min(5).max(500),
});

const officerSchema = z.object({
  id: z.uuid().optional(),
  position: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(200),
  termStartsAt: nullableDate,
  termEndsAt: nullableDate,
});

const municipalActivitySchema = z.object({
  id: z.uuid().optional(),
  branchName: nullableText(120),
  jurisdiction: z.string().trim().min(2).max(200),
  economicActivity: z.string().trim().min(2).max(300),
  rate: z
    .string()
    .trim()
    .regex(/^\d+(?:[.,]\d{1,4})?$/, "El factor municipal no es válido.")
    .transform((value) => value.replace(",", ".")),
  effectiveFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Indica desde cuándo aplica el factor.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  source: z.string().trim().min(3).max(500),
});

const companyFieldsSchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradeName: nullableText(200),
  rif: z.string().trim().toUpperCase().min(8).max(24),
  activity: nullableText(300),
  taxpayerType: nullableText(80),
  fiscalAddress: nullableText(500),
  contactName: nullableText(200),
  contactEmail: nullableEmail,
  contactPhone: nullableText(40),
  responsibleProfileId: z
    .union([z.literal(""), z.uuid()])
    .transform((value) => value || null),
  servicePlan: nullableText(100),
  ivssEmployerNumber: nullableText(80),
  faovPayrollNumber: nullableText(80),
  incorporationDate: nullableDate,
  commercialRegistry: nullableText(250),
  registryFolio: nullableText(80),
  registryDocument: nullableText(120),
  shareCapital: nullableText(180),
  incesRncp: nullableText(100),
  legalRepresentativeName: nullableText(200),
  legalRepresentativeDocument: nullableText(40),
  legalRepresentativePhone: nullableText(40),
  legalRepresentativeEmail: nullableEmail,
  clientPortalEnabled: z.boolean(),
  restrictedTaxAccessEnabled: z.boolean(),
  branches: z.array(branchSchema).max(30),
  officers: z.array(officerSchema).max(50),
  taxOfferingKeys: z.array(z.string().trim().min(1).max(100)).max(100),
  serviceOfferingKeys: z.array(z.string().trim().min(1).max(100)).max(100),
  municipalActivities: z.array(municipalActivitySchema).max(100),
});

export const createCompanySchema = companyFieldsSchema;
export const updateCompanySchema = companyFieldsSchema.extend({
  version: z.number().int().positive(),
});
export const archiveCompanySchema = z.object({
  version: z.number().int().positive(),
  confirmation: z.literal("ELIMINAR"),
});
export const activeCompanySchema = z.object({ companyId: z.uuid().nullable() });

export function normalizeRif(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function assertFirmManagement(auth: AuthContext) {
  if (!auth.firmScope)
    throw new AuthorizationError(
      "La gestión de empresas requiere acceso a toda la firma.",
    );
  requirePermission(auth, permissions.companiesManage);
}

function dateValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

const companyInclude = {
  branches: { where: { active: true }, orderBy: { name: "asc" } },
  officers: { orderBy: { createdAt: "asc" } },
  offerings: { orderBy: [{ kind: "asc" }, { offeringKey: "asc" }] },
  municipalActivities: { orderBy: { effectiveFrom: "desc" } },
  responsibleProfile: { select: { id: true, displayName: true } },
} satisfies Prisma.CompanyInclude;

type CompanyWithDetails = Prisma.CompanyGetPayload<{
  include: typeof companyInclude;
}>;
type OfferingCondition = "ORDINARY" | "SPECIAL_TAXPAYER" | "ALL";

function offeringAppliesToTaxpayer(
  condition: OfferingCondition,
  taxpayerType: string | null,
) {
  if (condition === "ALL") return true;
  const isSpecialTaxpayer =
    taxpayerType?.trim().toLocaleLowerCase("es").includes("especial") ?? false;
  return condition === "SPECIAL_TAXPAYER"
    ? isSpecialTaxpayer
    : !isSpecialTaxpayer;
}

function serializeCompany(
  company: CompanyWithDetails,
  enabledOfferings?: Map<string, OfferingCondition>,
) {
  return {
    id: company.id,
    version: company.version,
    legalName: company.legalName,
    tradeName: company.tradeName ?? "",
    rif: company.rif,
    activity: company.activity ?? "",
    taxpayerType: company.taxpayerType ?? "",
    fiscalAddress: company.fiscalAddress ?? "",
    contactName: company.contactName ?? "",
    contactEmail: company.contactEmail ?? "",
    contactPhone: company.contactPhone ?? "",
    responsibleProfileId: company.responsibleProfileId ?? "",
    responsibleName: company.responsibleProfile?.displayName ?? null,
    servicePlan: company.servicePlan ?? "",
    ivssEmployerNumber: company.ivssEmployerNumber ?? "",
    faovPayrollNumber: company.faovPayrollNumber ?? "",
    incorporationDate: dateValue(company.incorporationDate),
    commercialRegistry: company.commercialRegistry ?? "",
    registryFolio: company.registryFolio ?? "",
    registryDocument: company.registryDocument ?? "",
    shareCapital: company.shareCapital ?? "",
    incesRncp: company.incesRncp ?? "",
    legalRepresentativeName: company.legalRepresentativeName ?? "",
    legalRepresentativeDocument: company.legalRepresentativeDocument ?? "",
    legalRepresentativePhone: company.legalRepresentativePhone ?? "",
    legalRepresentativeEmail: company.legalRepresentativeEmail ?? "",
    clientPortalEnabled: company.clientPortalEnabled,
    restrictedTaxAccessEnabled: company.restrictedTaxAccessEnabled,
    status: company.status,
    branchesCount: company.branches.length,
    branches: company.branches.map(({ id, name, code, address }) => ({
      id,
      name,
      code: code ?? "",
      address,
    })),
    officers: company.officers.map(
      ({ id, position, fullName, termStartsAt, termEndsAt }) => ({
        id,
        position,
        fullName,
        termStartsAt: dateValue(termStartsAt),
        termEndsAt: dateValue(termEndsAt),
      }),
    ),
    taxOfferingKeys: company.offerings
      .filter(({ kind, offeringKey }) => {
        if (kind !== "TAX") return false;
        const condition = enabledOfferings?.get(`TAX:${offeringKey}`);
        return (
          !enabledOfferings ||
          (condition !== undefined &&
            offeringAppliesToTaxpayer(condition, company.taxpayerType))
        );
      })
      .map(({ offeringKey }) => offeringKey),
    serviceOfferingKeys: company.offerings
      .filter(
        ({ kind, offeringKey }) =>
          kind === "SERVICE" &&
          (!enabledOfferings || enabledOfferings.has(`SERVICE:${offeringKey}`)),
      )
      .map(({ offeringKey }) => offeringKey),
    municipalActivities: company.municipalActivities.map(
      ({
        id,
        branchName,
        jurisdiction,
        economicActivity,
        rate,
        effectiveFrom,
        source,
      }) => ({
        id,
        branchName: branchName ?? "",
        jurisdiction,
        economicActivity,
        rate: rate.toString().replace(".", ","),
        effectiveFrom: dateValue(effectiveFrom),
        source,
      }),
    ),
  };
}

function findCompanyOrThrow(
  transaction: Prisma.TransactionClient,
  companyId: string,
) {
  return transaction.company.findFirstOrThrow({
    where: { id: companyId, status: { not: "ARCHIVED" } },
    include: companyInclude,
  });
}

async function assertResponsibleProfile(
  transaction: Prisma.TransactionClient,
  firmId: string,
  profileId: string | null,
) {
  if (!profileId) return;
  const profile = await transaction.userProfile.findFirst({
    where: { id: profileId, firmId, active: true },
    select: { id: true },
  });
  if (!profile)
    throw new Error(
      "El responsable seleccionado no está disponible en la firma.",
    );
}

function scalarData(input: z.infer<typeof companyFieldsSchema>) {
  return {
    legalName: input.legalName,
    tradeName: input.tradeName,
    rif: input.rif,
    normalizedRif: normalizeRif(input.rif),
    activity: input.activity,
    taxpayerType: input.taxpayerType,
    fiscalAddress: input.fiscalAddress,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    responsibleProfileId: input.responsibleProfileId,
    servicePlan: input.servicePlan,
    ivssEmployerNumber: input.ivssEmployerNumber,
    faovPayrollNumber: input.faovPayrollNumber,
    incorporationDate: input.incorporationDate,
    commercialRegistry: input.commercialRegistry,
    registryFolio: input.registryFolio,
    registryDocument: input.registryDocument,
    shareCapital: input.shareCapital,
    incesRncp: input.incesRncp,
    legalRepresentativeName: input.legalRepresentativeName,
    legalRepresentativeDocument: input.legalRepresentativeDocument,
    legalRepresentativePhone: input.legalRepresentativePhone,
    legalRepresentativeEmail: input.legalRepresentativeEmail,
    clientPortalEnabled: input.clientPortalEnabled,
    restrictedTaxAccessEnabled: input.restrictedTaxAccessEnabled,
  };
}

function nestedData(input: z.infer<typeof companyFieldsSchema>) {
  return {
    branches: input.branches.map((branch) => ({ ...branch, active: true })),
    officers: input.officers,
    offerings: [
      ...[...new Set(input.taxOfferingKeys)].map((offeringKey) => ({
        kind: "TAX" as const,
        offeringKey,
      })),
      ...[...new Set(input.serviceOfferingKeys)].map((offeringKey) => ({
        kind: "SERVICE" as const,
        offeringKey,
      })),
    ],
    municipalActivities: input.municipalActivities,
  };
}

async function assertEnabledOfferings(
  transaction: Prisma.TransactionClient,
  firmId: string,
  input: z.infer<typeof companyFieldsSchema>,
) {
  const selected = [
    ...input.taxOfferingKeys.map((key) => ({ key, kind: "TAX" as const })),
    ...input.serviceOfferingKeys.map((key) => ({
      key,
      kind: "SERVICE" as const,
    })),
  ];
  if (!selected.length) return;
  const enabled = await transaction.firmOffering.findMany({
    where: { firmId, active: true, OR: selected },
    select: { key: true, kind: true, taxpayerCondition: true },
  });
  const enabledKeys = new Set(enabled.map(({ key, kind }) => `${kind}:${key}`));
  if (selected.some(({ key, kind }) => !enabledKeys.has(`${kind}:${key}`))) {
    throw new Error(
      "Una obligación o servicio seleccionado ya no está habilitado en la configuración de la firma.",
    );
  }
  if (
    enabled.some(
      (offering) =>
        offering.kind === "TAX" &&
        !offeringAppliesToTaxpayer(
          offering.taxpayerCondition,
          input.taxpayerType,
        ),
    )
  ) {
    throw new Error(
      "Un impuesto seleccionado no aplica al tipo de contribuyente de la empresa.",
    );
  }
}

function duplicateRifError(error: unknown): never {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2002"
  ) {
    throw new Error("Ya existe una empresa con este RIF en la firma.");
  }
  throw error;
}

export async function getCompanyDirectory(auth: AuthContext) {
  requirePermission(auth, permissions.companiesRead);
  return withAuthTransaction(auth, async (transaction) => {
    const [companies, staff, offerings] = await Promise.all([
      transaction.company.findMany({
        where: { status: { not: "ARCHIVED" } },
        include: companyInclude,
        orderBy: { legalName: "asc" },
      }),
      auth.firmScope
        ? transaction.userProfile.findMany({
            where: { firmId: auth.firmId, active: true, profileType: "STAFF" },
            select: { id: true, displayName: true },
            orderBy: { displayName: "asc" },
          })
        : Promise.resolve([]),
      transaction.firmOffering.findMany({
        where: { firmId: auth.firmId, active: true },
        select: {
          key: true,
          name: true,
          organism: true,
          frequency: true,
          kind: true,
          taxpayerCondition: true,
        },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
      }),
    ]);
    return {
      activeCompanyId: auth.activeCompanyId,
      companies: companies.map((company) =>
        serializeCompany(
          company,
          new Map(
            offerings.map(({ kind, key, taxpayerCondition }) => [
              `${kind}:${key}`,
              taxpayerCondition,
            ]),
          ),
        ),
      ),
      staff: staff.map(({ id, displayName }) => ({ id, name: displayName })),
      offerings: offerings.map(
        ({ key, name, organism, frequency, kind, taxpayerCondition }) => ({
          id: key,
          name,
          organism,
          cadence: frequency,
          kind,
          taxpayerCondition,
        }),
      ),
      canManage:
        auth.firmScope &&
        auth.permissionKeys.includes(permissions.companiesManage),
    };
  });
}

export async function getCompany(auth: AuthContext, companyId: string) {
  requirePermission(auth, permissions.companiesRead);
  return withAuthTransaction(auth, async (transaction) => {
    const [company, offerings] = await Promise.all([
      findCompanyOrThrow(transaction, companyId),
      transaction.firmOffering.findMany({
        where: { firmId: auth.firmId, active: true },
        select: { key: true, kind: true, taxpayerCondition: true },
      }),
    ]);
    return serializeCompany(
      company,
      new Map(
        offerings.map(({ kind, key, taxpayerCondition }) => [
          `${kind}:${key}`,
          taxpayerCondition,
        ]),
      ),
    );
  });
}

export async function createCompany(auth: AuthContext, rawInput: unknown) {
  assertFirmManagement(auth);
  const input = createCompanySchema.parse(rawInput);
  const nested = nestedData(input);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      await assertResponsibleProfile(
        transaction,
        auth.firmId,
        input.responsibleProfileId,
      );
      await assertEnabledOfferings(transaction, auth.firmId, input);
      const company = await transaction.company.create({
        data: {
          firmId: auth.firmId,
          ...scalarData(input),
          branches: {
            create: nested.branches.map(({ id: _id, ...branch }) => branch),
          },
          officers: {
            create: nested.officers.map(({ id: _id, ...officer }) => officer),
          },
          offerings: { create: nested.offerings },
          municipalActivities: {
            create: nested.municipalActivities.map(
              ({ id: _id, ...activity }) => activity,
            ),
          },
        },
        include: companyInclude,
      });
      await transaction.userProfile.update({
        where: { userId: auth.userId },
        data: { activeCompanyId: company.id },
      });
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "company.created",
          entityType: "company",
          entityId: company.id,
          metadata: {
            rif: company.normalizedRif,
            branches: nested.branches.length,
            offerings: nested.offerings.length,
            municipalActivities: nested.municipalActivities.length,
          },
        },
      });
      return serializeCompany(company);
    });
  } catch (error) {
    return duplicateRifError(error);
  }
}

export async function updateCompany(
  auth: AuthContext,
  companyId: string,
  rawInput: unknown,
) {
  assertFirmManagement(auth);
  const input = updateCompanySchema.parse(rawInput);
  const nested = nestedData(input);
  try {
    return await withAuthTransaction(auth, async (transaction) => {
      await assertResponsibleProfile(
        transaction,
        auth.firmId,
        input.responsibleProfileId,
      );
      await assertEnabledOfferings(transaction, auth.firmId, input);
      const updated = await transaction.company.updateMany({
        where: {
          id: companyId,
          firmId: auth.firmId,
          version: input.version,
          status: { not: "ARCHIVED" },
        },
        data: { ...scalarData(input), version: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new Error(
          "La empresa cambió en otra sesión. Recarga antes de guardar.",
        );
      const branchIds = nested.branches.flatMap(({ id }) => (id ? [id] : []));
      const officerIds = nested.officers.flatMap(({ id }) => (id ? [id] : []));
      const municipalActivityIds = nested.municipalActivities.flatMap(
        ({ id }) => (id ? [id] : []),
      );
      await transaction.branch.deleteMany({
        where: {
          companyId,
          ...(branchIds.length ? { id: { notIn: branchIds } } : {}),
        },
      });
      await transaction.companyOfficer.deleteMany({
        where: {
          companyId,
          ...(officerIds.length ? { id: { notIn: officerIds } } : {}),
        },
      });
      await transaction.companyMunicipalActivity.deleteMany({
        where: {
          companyId,
          ...(municipalActivityIds.length
            ? { id: { notIn: municipalActivityIds } }
            : {}),
        },
      });
      await transaction.companyOffering.deleteMany({ where: { companyId } });
      for (const { id, ...branch } of nested.branches) {
        if (id) {
          const result = await transaction.branch.updateMany({
            where: { id, companyId },
            data: branch,
          });
          if (result.count !== 1)
            throw new Error("Una sucursal ya no pertenece a esta empresa.");
        } else
          await transaction.branch.create({ data: { companyId, ...branch } });
      }
      for (const { id, ...officer } of nested.officers) {
        if (id) {
          const result = await transaction.companyOfficer.updateMany({
            where: { id, companyId },
            data: officer,
          });
          if (result.count !== 1)
            throw new Error("Un cargo legal ya no pertenece a esta empresa.");
        } else
          await transaction.companyOfficer.create({
            data: { companyId, ...officer },
          });
      }
      await transaction.companyOffering.createMany({
        data: nested.offerings.map((offering) => ({ companyId, ...offering })),
      });
      for (const { id, ...activity } of nested.municipalActivities) {
        if (id) {
          const result = await transaction.companyMunicipalActivity.updateMany({
            where: { id, companyId },
            data: activity,
          });
          if (result.count !== 1)
            throw new Error(
              "Un factor municipal ya no pertenece a esta empresa.",
            );
        } else
          await transaction.companyMunicipalActivity.create({
            data: { companyId, ...activity },
          });
      }
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "company.updated",
          entityType: "company",
          entityId: companyId,
          metadata: {
            version: input.version + 1,
            branches: nested.branches.length,
            offerings: nested.offerings.length,
          },
        },
      });
      return serializeCompany(await findCompanyOrThrow(transaction, companyId));
    });
  } catch (error) {
    return duplicateRifError(error);
  }
}

export async function setActiveCompany(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.companiesRead);
  const { companyId } = activeCompanySchema.parse(rawInput);
  if (companyId && !auth.allowedCompanyIds.includes(companyId))
    throw new AuthorizationError("No tienes acceso a esa empresa.");
  return withAuthTransaction(auth, async (transaction) => {
    if (companyId) {
      const company = await transaction.company.findFirst({
        where: { id: companyId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!company) throw new Error("La empresa seleccionada no está activa.");
    }
    const profile = await transaction.userProfile.update({
      where: { userId: auth.userId },
      data: { activeCompanyId: companyId },
      select: { id: true },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "company.active_context.changed",
        entityType: "user_profile",
        entityId: profile.id,
        metadata: { companyId },
      },
    });
    return { activeCompanyId: companyId };
  });
}

export async function archiveCompany(
  auth: AuthContext,
  companyId: string,
  rawInput: unknown,
) {
  assertFirmManagement(auth);
  const input = archiveCompanySchema.parse(rawInput);
  return withAuthTransaction(auth, async (transaction) => {
    const result = await transaction.company.updateMany({
      where: {
        id: companyId,
        firmId: auth.firmId,
        version: input.version,
        status: { not: "ARCHIVED" },
      },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new Error(
        "La empresa cambió en otra sesión. Recarga antes de retirarla.",
      );
    await transaction.userProfile.updateMany({
      where: { firmId: auth.firmId, activeCompanyId: companyId },
      data: { activeCompanyId: null },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "company.archived",
        entityType: "company",
        entityId: companyId,
        metadata: { version: input.version + 1 },
      },
    });
    return { id: companyId, archived: true };
  });
}
