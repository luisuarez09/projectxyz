import { describe, expect, it } from "vitest";

import { decryptCredential, encryptCredential } from "@/infrastructure/security/credential-encryption";

const environment = {
  CREDENTIAL_ENCRYPTION_ACTIVE_KEY: "v1",
  CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.alloc(32, 7).toString("base64"),
};

describe("credential encryption", () => {
  it("encrypts and decrypts with a versioned AES-256-GCM key", () => {
    const encrypted = encryptCredential("smtp-secret", environment);

    expect(encrypted.ciphertext.toString("utf8")).not.toBe("smtp-secret");
    expect(encrypted.keyVersion).toBe("v1");
    expect(decryptCredential(encrypted, environment)).toBe("smtp-secret");
  });

  it("rejects modified ciphertext", () => {
    const encrypted = encryptCredential("smtp-secret", environment);
    encrypted.ciphertext[0] ^= 1;

    expect(() => decryptCredential(encrypted, environment)).toThrow();
  });

  it("requires a configured 32-byte key", () => {
    expect(() => encryptCredential("smtp-secret", {
      CREDENTIAL_ENCRYPTION_ACTIVE_KEY: "v2",
    })).toThrow("No está configurada la clave de cifrado v2.");
  });
});
