import { describe, expect, it } from "vitest";

import {
  readAuthEnv,
  readMailEnv,
  readServerEnv,
} from "@/infrastructure/config/env";

describe("readServerEnv", () => {
  it("acepta una URL PostgreSQL y aplica valores seguros por defecto", () => {
    const environment = readServerEnv({
      DATABASE_URL: "postgresql://app:secret@localhost:55432/proyectoxyz",
    });

    expect(environment).toMatchObject({
      NODE_ENV: "development",
      LOG_LEVEL: "info",
    });
  });

  it("rechaza motores de base de datos distintos de PostgreSQL", () => {
    expect(() =>
      readServerEnv({ DATABASE_URL: "mysql://app:secret@localhost/database" }),
    ).toThrow();
  });
});

describe("readMailEnv", () => {
  const validMailEnvironment = {
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "smtp-user",
    SMTP_PASSWORD: "smtp-secret",
    MAIL_FROM_ADDRESS: "acceso@example.test",
    MAIL_FROM_NAME: "proyectoxyz",
    MAIL_REPLY_TO: "soporte@example.test",
  };

  it("prepara STARTTLS por defecto y convierte el puerto", () => {
    expect(readMailEnv(validMailEnvironment)).toMatchObject({
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      SMTP_REQUIRE_TLS: true,
    });
  });

  it("rechaza remitentes inválidos", () => {
    expect(() =>
      readMailEnv({
        ...validMailEnvironment,
        MAIL_FROM_ADDRESS: "no-es-un-correo",
      }),
    ).toThrow();
  });
});

describe("readAuthEnv", () => {
  it("permite valores locales seguros para el entorno de desarrollo", () => {
    expect(readAuthEnv({ NODE_ENV: "development" })).toMatchObject({
      BETTER_AUTH_URL: "http://localhost:3000",
    });
  });

  it("obliga a provisionar URL y secreto en producción", () => {
    expect(() => readAuthEnv({ NODE_ENV: "production" })).toThrow();
  });
});
