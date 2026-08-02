import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "token",
      "invitationUrl",
      "*.invitationUrl",
      "authorization",
      "req.headers.authorization",
      "SMTP_PASSWORD",
      "smtpPassword",
      "smtp_password",
      "smtpPasswordCiphertext",
      "CREDENTIAL_ENCRYPTION_KEY_*",
      "BETTER_AUTH_SECRET",
      "S3_SECRET_ACCESS_KEY",
    ],
    censor: "[REDACTED]",
  },
});
