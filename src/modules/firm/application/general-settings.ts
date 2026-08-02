import { randomUUID } from "node:crypto";

import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const nullableText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);

export const firmGeneralSettingsSchema = z.object({
  version: z.number().int().positive(),
  entityType: z.enum(["NATURAL_PERSON", "LEGAL_ENTITY"]),
  legalName: z.string().trim().min(2).max(200),
  tradeName: nullableText(200),
  rif: z.string().trim().toUpperCase().min(5).max(24),
  fiscalAddress: nullableText(500),
  email: z.union([z.literal(""), z.email()]).transform((value) => value || null),
  phone: nullableText(40),
  pdfHeader: nullableText(500),
  pdfFooter: nullableText(300),
});

function assertFirmAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope) throw new AuthorizationError("La configuración requiere acceso a toda la firma.");
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
  logoStoredObject: {
    select: { id: true, originalName: true, status: true },
  },
  updatedAt: true,
} as const;

export async function getFirmGeneralSettings(auth: AuthContext) {
  assertFirmAccess(auth, permissions.firmSettingsRead);
  return withAuthTransaction(auth, (transaction) => transaction.firm.findUniqueOrThrow({
    where: { id: auth.firmId },
    select: firmGeneralSelect,
  }));
}

export async function saveFirmGeneralSettings(auth: AuthContext, rawInput: unknown) {
  assertFirmAccess(auth, permissions.firmSettingsUpdate);
  const input = firmGeneralSettingsSchema.parse(rawInput);

  return withAuthTransaction(auth, async (transaction) => {
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
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new Error("La configuración cambió en otra sesión. Recarga la página antes de guardar.");
    }

    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "firm.general_settings.updated",
        entityType: "firm",
        entityId: auth.firmId,
        metadata: { version: input.version + 1, entityType: input.entityType },
      },
    });

    return transaction.firm.findUniqueOrThrow({ where: { id: auth.firmId }, select: firmGeneralSelect });
  });
}
