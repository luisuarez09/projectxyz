import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url().startsWith("postgresql://"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const booleanEnvironmentValue = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const mailEnvSchema = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
  SMTP_SECURE: booleanEnvironmentValue.default(false),
  SMTP_REQUIRE_TLS: booleanEnvironmentValue.default(true),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().min(1),
  MAIL_FROM_ADDRESS: z.email(),
  MAIL_FROM_NAME: z.string().trim().min(1),
  MAIL_REPLY_TO: z.email(),
});

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type MailEnv = z.infer<typeof mailEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;

type Environment = Record<string, string | undefined>;

export function readServerEnv(environment: Environment = process.env): ServerEnv {
  return serverEnvSchema.parse(environment);
}

export function readMailEnv(environment: Environment = process.env): MailEnv {
  return mailEnvSchema.parse(environment);
}

export function readAuthEnv(environment: Environment = process.env): AuthEnv {
  const production = environment.NODE_ENV === "production";

  return authEnvSchema.parse({
    BETTER_AUTH_SECRET:
      environment.BETTER_AUTH_SECRET ??
      (production ? undefined : "development-only-secret-change-me-0001"),
    BETTER_AUTH_URL:
      environment.BETTER_AUTH_URL ??
      (production ? undefined : "http://localhost:3000"),
  });
}
