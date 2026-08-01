import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "req.headers.authorization",
      "SMTP_PASSWORD",
      "BETTER_AUTH_SECRET",
      "S3_SECRET_ACCESS_KEY",
    ],
    censor: "[REDACTED]",
  },
});
