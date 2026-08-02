import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export type EncryptedCredential = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: string;
};

function readKey(
  keyVersion: string,
  environment: Record<string, string | undefined>,
): Buffer {
  if (!/^[A-Za-z0-9_]+$/.test(keyVersion)) {
    throw new Error("La versión de la clave de cifrado no es válida.");
  }

  const encodedKey = environment[`CREDENTIAL_ENCRYPTION_KEY_${keyVersion.toUpperCase()}`];
  if (!encodedKey) {
    throw new Error(`No está configurada la clave de cifrado ${keyVersion}.`);
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== KEY_LENGTH || key.toString("base64").replace(/=+$/, "") !== encodedKey.replace(/=+$/, "")) {
    throw new Error("La clave de cifrado debe contener exactamente 32 bytes en Base64.");
  }

  return key;
}

export function encryptCredential(
  value: string,
  environment: Record<string, string | undefined> = process.env,
): EncryptedCredential {
  if (!value) throw new Error("La credencial no puede estar vacía.");
  const keyVersion = environment.CREDENTIAL_ENCRYPTION_ACTIVE_KEY;
  if (!keyVersion) throw new Error("No está configurada la versión activa de cifrado.");

  const key = readKey(keyVersion, environment);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion };
}

export function decryptCredential(
  encrypted: EncryptedCredential,
  environment: Record<string, string | undefined> = process.env,
): string {
  const key = readKey(encrypted.keyVersion, environment);
  const decipher = createDecipheriv(ALGORITHM, key, encrypted.iv);
  decipher.setAuthTag(encrypted.authTag);

  return Buffer.concat([
    decipher.update(encrypted.ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
