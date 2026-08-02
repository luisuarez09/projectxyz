import { randomUUID } from "node:crypto";

import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { createSmtpMailDeliveryFromConfig } from "@/infrastructure/mail/smtp-mail-delivery";
import { decryptCredential, encryptCredential } from "@/infrastructure/security/credential-encryption";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const optionalText = z.string().trim().max(320).optional().transform((value) => value || null);

export const firmMailSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["MAILRELAY", "CUSTOM_SMTP"]),
  senderDomain: optionalText,
  smtpHost: optionalText,
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpRequireTls: z.boolean(),
  smtpUser: optionalText,
  smtpPassword: z.string().max(1024).optional().transform((value) => value || null),
  fromAddress: z.union([z.literal(""), z.email()]).optional().transform((value) => value || null),
  fromName: z.string().trim().min(1).max(160),
  replyTo: z.union([z.literal(""), z.email()]).optional().transform((value) => value || null),
});

type MailSettingsInput = z.infer<typeof firmMailSettingsSchema>;

type StoredSettings = {
  id: string;
  enabled: boolean;
  provider: "MAILRELAY" | "CUSTOM_SMTP";
  senderDomain: string | null;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpRequireTls: boolean;
  smtpUser: string | null;
  smtpPasswordCiphertext: Uint8Array<ArrayBufferLike> | null;
  smtpPasswordIv: Uint8Array<ArrayBufferLike> | null;
  smtpPasswordAuthTag: Uint8Array<ArrayBufferLike> | null;
  smtpPasswordKeyVersion: string | null;
  fromAddress: string | null;
  fromName: string;
  replyTo: string | null;
  connectionStatus: "NOT_TESTED" | "VERIFIED" | "FAILED";
  lastVerifiedAt: Date | null;
  lastConnectionError: string | null;
  updatedAt: Date;
};

export type FirmMailSettingsView = Omit<StoredSettings,
  "smtpPasswordCiphertext" | "smtpPasswordIv" | "smtpPasswordAuthTag" | "smtpPasswordKeyVersion"
> & { hasPassword: boolean };

function assertFirmSettingsAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope) throw new AuthorizationError("La configuración requiere acceso a toda la firma.");
  requirePermission(auth, permission);
}

function toView(settings: StoredSettings): FirmMailSettingsView {
  return {
    id: settings.id,
    enabled: settings.enabled,
    provider: settings.provider,
    senderDomain: settings.senderDomain,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpRequireTls: settings.smtpRequireTls,
    smtpUser: settings.smtpUser,
    fromAddress: settings.fromAddress,
    fromName: settings.fromName,
    replyTo: settings.replyTo,
    connectionStatus: settings.connectionStatus,
    lastVerifiedAt: settings.lastVerifiedAt,
    lastConnectionError: settings.lastConnectionError,
    updatedAt: settings.updatedAt,
    hasPassword: Boolean(settings.smtpPasswordCiphertext),
  };
}

function connectionChanged(current: StoredSettings | null, next: MailSettingsInput): boolean {
  if (!current) return true;
  return Boolean(next.smtpPassword) || [
    [current.provider, next.provider],
    [current.senderDomain, next.senderDomain],
    [current.smtpHost, next.smtpHost],
    [current.smtpPort, next.smtpPort],
    [current.smtpSecure, next.smtpSecure],
    [current.smtpRequireTls, next.smtpRequireTls],
    [current.smtpUser, next.smtpUser],
    [current.fromAddress, next.fromAddress],
    [current.fromName, next.fromName],
    [current.replyTo, next.replyTo],
  ].some(([before, after]) => before !== after);
}

export async function getFirmMailSettings(auth: AuthContext): Promise<FirmMailSettingsView | null> {
  assertFirmSettingsAccess(auth, permissions.firmSettingsRead);
  return withAuthTransaction(auth, async (transaction) => {
    const settings = await transaction.firmMailSettings.findUnique({ where: { firmId: auth.firmId } });
    return settings ? toView(settings) : null;
  });
}

export async function saveFirmMailSettings(
  auth: AuthContext,
  rawInput: unknown,
): Promise<FirmMailSettingsView> {
  assertFirmSettingsAccess(auth, permissions.firmSettingsUpdate);
  const input = firmMailSettingsSchema.parse(rawInput);

  return withAuthTransaction(auth, async (transaction) => {
    const current = await transaction.firmMailSettings.findUnique({ where: { firmId: auth.firmId } });
    const changed = connectionChanged(current, input);
    if (input.enabled && (changed || current?.connectionStatus !== "VERIFIED")) {
      throw new Error("Guarda y verifica la conexión antes de activar las notificaciones.");
    }
    if (!input.smtpPassword && !current?.smtpPasswordCiphertext) {
      if (input.enabled) throw new Error("La contraseña SMTP es obligatoria para activar los envíos.");
    }

    const encrypted = input.smtpPassword ? encryptCredential(input.smtpPassword) : null;
    const secretData = encrypted ? {
      smtpPasswordCiphertext: Uint8Array.from(encrypted.ciphertext),
      smtpPasswordIv: Uint8Array.from(encrypted.iv),
      smtpPasswordAuthTag: Uint8Array.from(encrypted.authTag),
      smtpPasswordKeyVersion: encrypted.keyVersion,
    } : {};
    const connectionData = changed ? {
      enabled: false,
      connectionStatus: "NOT_TESTED" as const,
      lastVerifiedAt: null,
      lastConnectionError: null,
    } : { enabled: input.enabled };
    const commonData = {
      provider: input.provider,
      senderDomain: input.senderDomain,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpRequireTls: input.smtpRequireTls,
      smtpUser: input.smtpUser,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      replyTo: input.replyTo,
      ...secretData,
      ...connectionData,
    };

    const saved = current
      ? await transaction.firmMailSettings.update({
          where: { id: current.id },
          data: { ...commonData, version: { increment: 1 } },
        })
      : await transaction.firmMailSettings.create({
          data: { firmId: auth.firmId, ...commonData },
        });

    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "firm.mail_settings.updated",
        entityType: "firm_mail_settings",
        entityId: saved.id,
        metadata: { provider: saved.provider, enabled: saved.enabled, connectionReset: changed },
      },
    });
    return toView(saved);
  });
}

export async function testFirmMailConnection(auth: AuthContext): Promise<FirmMailSettingsView> {
  assertFirmSettingsAccess(auth, permissions.firmMailTest);
  return withAuthTransaction(auth, async (transaction) => {
    const settings = await transaction.firmMailSettings.findUnique({ where: { firmId: auth.firmId } });
    if (!settings?.smtpHost || !settings.smtpUser || !settings.fromAddress || !settings.replyTo ||
        !settings.senderDomain || !settings.smtpPasswordCiphertext || !settings.smtpPasswordIv ||
        !settings.smtpPasswordAuthTag || !settings.smtpPasswordKeyVersion) {
      throw new Error("Completa y guarda todos los datos SMTP antes de probar la conexión.");
    }

    const password = decryptCredential({
      ciphertext: Buffer.from(settings.smtpPasswordCiphertext),
      iv: Buffer.from(settings.smtpPasswordIv),
      authTag: Buffer.from(settings.smtpPasswordAuthTag),
      keyVersion: settings.smtpPasswordKeyVersion,
    });

    try {
      await createSmtpMailDeliveryFromConfig({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        requireTLS: settings.smtpRequireTls,
        user: settings.smtpUser,
        password,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName,
        replyTo: settings.replyTo,
      }).verifyConnection();

      const verified = await transaction.firmMailSettings.update({
        where: { id: settings.id },
        data: {
          enabled: false,
          connectionStatus: "VERIFIED",
          lastVerifiedAt: new Date(),
          lastConnectionError: null,
          version: { increment: 1 },
        },
      });
      await transaction.auditEvent.create({
        data: {
          firmId: auth.firmId,
          actorUserId: auth.userId,
          requestId: randomUUID(),
          eventType: "firm.mail_settings.verified",
          entityType: "firm_mail_settings",
          entityId: settings.id,
          metadata: { provider: settings.provider },
        },
      });
      return toView(verified);
    } catch {
      const failed = await transaction.firmMailSettings.update({
        where: { id: settings.id },
        data: {
          enabled: false,
          connectionStatus: "FAILED",
          lastVerifiedAt: null,
          lastConnectionError: "El servidor SMTP rechazó la verificación. Revisa host, puerto, TLS y credenciales.",
          version: { increment: 1 },
        },
      });
      return toView(failed);
    }
  });
}
