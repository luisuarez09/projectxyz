import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { createSmtpMailDeliveryFromConfig } from "@/infrastructure/mail/smtp-mail-delivery";
import { decryptCredential } from "@/infrastructure/security/credential-encryption";
import type { AuthContext } from "@/modules/shared/application/context";

export async function getEnabledFirmMailDelivery(auth: AuthContext) {
  const settings = await withAuthTransaction(auth, (transaction) => transaction.firmMailSettings.findUnique({
    where: { firmId: auth.firmId },
  }));
  if (!settings?.enabled || settings.connectionStatus !== "VERIFIED" ||
      !settings.smtpHost || !settings.smtpUser || !settings.fromAddress || !settings.replyTo ||
      !settings.smtpPasswordCiphertext || !settings.smtpPasswordIv ||
      !settings.smtpPasswordAuthTag || !settings.smtpPasswordKeyVersion) {
    return null;
  }

  const password = decryptCredential({
    ciphertext: Buffer.from(settings.smtpPasswordCiphertext),
    iv: Buffer.from(settings.smtpPasswordIv),
    authTag: Buffer.from(settings.smtpPasswordAuthTag),
    keyVersion: settings.smtpPasswordKeyVersion,
  });
  return createSmtpMailDeliveryFromConfig({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    requireTLS: settings.smtpRequireTls,
    user: settings.smtpUser,
    password,
    fromAddress: settings.fromAddress,
    fromName: settings.fromName,
    replyTo: settings.replyTo,
  });
}
