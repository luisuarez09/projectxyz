import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";
import { type LaborSettingsDetail, type LaborSettingsFormData, type LaborDeductionRow, emptyLaborSettings } from "../domain/labor-settings";

const nullableDate = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "La fecha no es válida.")
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : null));

const nullableDecimalText = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,4})?$/, "El monto no es válido.")
  .transform((value) => (value ? value.replace(",", ".") : null))
  .or(z.literal("").transform(() => null));

const deductionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  ratePercent: nullableDecimalText,
  basis: z.string().min(1),
  cap: nullableDecimalText,
  capCurrency: z.string().trim().min(1),
  effectiveFrom: nullableDate,
  source: z.string().trim().max(500).transform((v) => v || null),
  active: z.boolean(),
});

const laborSettingsSchema = z.object({
  version: z.number().int().positive().optional(),
  payrollFrequency: z.string().min(1),
  salaryCurrency: z.string().min(1),
  rateSource: z.string().min(1),
  rateLockMoment: z.string().min(1),

  minWageAmount: nullableDecimalText,
  minWageCurrency: z.string().min(1),
  minWageEffectiveFrom: nullableDate,
  minWageSource: z.string().trim().max(500).transform((v) => v || null),

  benefitScheme: z.string().min(1),
  vacationSchedule: z.string().min(1),

  vacationDaysBase: z.coerce.number().int().min(0),
  vacationDaysIncrement: z.coerce.number().int().min(0),
  vacationDaysCap: z.coerce.number().int().min(0),
  vacationBasis: z.string().min(1),

  bonusDaysBase: z.coerce.number().int().min(0),
  bonusDaysIncrement: z.coerce.number().int().min(0),
  bonusDaysCap: z.coerce.number().int().min(0),
  bonusBasis: z.string().min(1),

  profitDaysBase: z.coerce.number().int().min(0),
  profitDaysIncrement: z.coerce.number().int().min(0),
  profitDaysCap: z.coerce.number().int().min(0),
  profitBasis: z.string().min(1),

  foodBonusAmount: nullableDecimalText.transform((v) => v || "0"),
  foodBonusCurrency: z.string().min(1),
  foodBonusCadence: z.string().min(1),
  foodBonusSource: z.string().trim().max(500).transform((v) => v || null),

  deductions: z.array(deductionSchema),
});

function dateValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function serializeLaborSettings(
  settings: Prisma.CompanyLaborSettingsGetPayload<{ include: { deductions: true } }>
): LaborSettingsDetail {
  return {
    id: settings.id,
    version: settings.version,
    payrollFrequency: settings.payrollFrequency as any,
    salaryCurrency: settings.salaryCurrency,
    rateSource: settings.rateSource as any,
    rateLockMoment: settings.rateLockMoment as any,

    minWageAmount: settings.minWageAmount ? settings.minWageAmount.toString() : "",
    minWageCurrency: settings.minWageCurrency,
    minWageEffectiveFrom: dateValue(settings.minWageEffectiveFrom),
    minWageSource: settings.minWageSource ?? "",

    benefitScheme: settings.benefitScheme as any,
    vacationSchedule: settings.vacationSchedule as any,

    vacationDaysBase: settings.vacationDaysBase.toString(),
    vacationDaysIncrement: settings.vacationDaysIncrement.toString(),
    vacationDaysCap: settings.vacationDaysCap.toString(),
    vacationBasis: settings.vacationBasis as any,

    bonusDaysBase: settings.bonusDaysBase.toString(),
    bonusDaysIncrement: settings.bonusDaysIncrement.toString(),
    bonusDaysCap: settings.bonusDaysCap.toString(),
    bonusBasis: settings.bonusBasis as any,

    profitDaysBase: settings.profitDaysBase.toString(),
    profitDaysIncrement: settings.profitDaysIncrement.toString(),
    profitDaysCap: settings.profitDaysCap.toString(),
    profitBasis: settings.profitBasis as any,

    foodBonusAmount: settings.foodBonusAmount.toString(),
    foodBonusCurrency: settings.foodBonusCurrency,
    foodBonusCadence: settings.foodBonusCadence as any,
    foodBonusSource: settings.foodBonusSource ?? "",

    deductions: settings.deductions.sort((a: any, b: any) => a.ordinal - b.ordinal).map((d: any) => ({
      id: d.id,
      name: d.name,
      ratePercent: d.ratePercent ? d.ratePercent.toString() : "",
      basis: d.basis as any,
      cap: d.cap ? d.cap.toString() : "",
      capCurrency: d.capCurrency,
      effectiveFrom: dateValue(d.effectiveFrom),
      source: d.source ?? "",
      active: d.active,
    })),
  };
}


export async function getLaborSettings(auth: AuthContext) {
  requirePermission(auth, permissions.companiesManage);
  const companyId = auth.activeCompanyId;
  if (!companyId) throw new AuthorizationError("No has seleccionado una empresa activa.");
  return withAuthTransaction(auth, async (transaction) => {
    const settings = await transaction.companyLaborSettings.findUnique({
      where: { companyId },
      include: { deductions: true },
    });
    if (!settings) {
      return emptyLaborSettings;
    }
    return serializeLaborSettings(settings as any);
  });
}

export async function upsertLaborSettings(auth: AuthContext, rawInput: unknown) {
  requirePermission(auth, permissions.companiesManage);
  const companyId = auth.activeCompanyId;
  if (!companyId) throw new AuthorizationError("No has seleccionado una empresa activa.");
  const input = laborSettingsSchema.parse(rawInput);
  
  return withAuthTransaction(auth, async (transaction) => {
    // Check if it exists to know if we need to enforce optimistic concurrency
    const existing = await transaction.companyLaborSettings.findUnique({
      where: { companyId },
      select: { id: true, version: true }
    });

    if (existing && input.version !== undefined) {
      if (existing.version !== input.version) {
        throw new Error("La configuración laboral cambió en otra sesión. Recarga antes de guardar.");
      }
    }

    const { deductions, version: _version, ...data } = input;

    const savedSettings = await transaction.companyLaborSettings.upsert({
      where: { companyId },
      update: { ...data, version: { increment: 1 } },
      create: { companyId, ...data },
      include: { deductions: true },
    });

    const existingDeductionIds = savedSettings.deductions.map((d: any) => d.id);
    const updatedDeductionIds = deductions.filter((d: any) => d.id).map((d: any) => d.id as string);
    const idsToDelete = existingDeductionIds.filter((id: any) => !updatedDeductionIds.includes(id));

    if (idsToDelete.length > 0) {
      await transaction.companyLaborDeduction.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }

    for (let i = 0; i < deductions.length; i++) {
      const deduction = deductions[i];
      if (deduction.id) {
        await transaction.companyLaborDeduction.update({
          where: { id: deduction.id },
          data: { ...deduction, ordinal: i }
        });
      } else {
        await transaction.companyLaborDeduction.create({
          data: { settingsId: savedSettings.id, ...deduction, ordinal: i }
        });
      }
    }

    const finalSettings = await transaction.companyLaborSettings.findUnique({
      where: { id: savedSettings.id },
      include: { deductions: true },
    });

    return serializeLaborSettings(finalSettings as any);
  });
}
