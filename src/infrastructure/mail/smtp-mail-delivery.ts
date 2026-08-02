import nodemailer, { type Transporter } from "nodemailer";

import { readMailEnv, type MailEnv } from "@/infrastructure/config/env";
import type { MailDelivery, MailMessage } from "@/infrastructure/mail/mail-delivery";

type SendMailResult = {
  messageId: string;
  accepted?: Array<string | { address?: string }>;
  rejected?: Array<string | { address?: string }>;
};

type SmtpTransport = Pick<Transporter<SendMailResult>, "sendMail" | "verify">;

export type SmtpDeliveryConfig = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
};

export class SmtpMailDelivery implements MailDelivery {
  constructor(
    private readonly transport: SmtpTransport,
    private readonly config: Pick<
      MailEnv,
      "MAIL_FROM_ADDRESS" | "MAIL_FROM_NAME" | "MAIL_REPLY_TO"
    >,
  ) {}

  async verifyConnection(): Promise<void> {
    await this.transport.verify();
  }

  async send(message: MailMessage): Promise<{ providerMessageId: string }> {
    const result = await this.transport.sendMail({
      from: {
        address: this.config.MAIL_FROM_ADDRESS,
        name: this.config.MAIL_FROM_NAME,
      },
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo ?? this.config.MAIL_REPLY_TO,
    });

    if (!result.messageId) {
      throw new Error("El servidor SMTP no devolvió un identificador de mensaje.");
    }

    return { providerMessageId: result.messageId };
  }
}

export function createSmtpMailDelivery(
  environment: Record<string, string | undefined> = process.env,
): SmtpMailDelivery {
  const config = readMailEnv(environment);
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    requireTLS: config.SMTP_REQUIRE_TLS,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  }) as SmtpTransport;

  return new SmtpMailDelivery(transport, config);
}

export function createSmtpMailDeliveryFromConfig(config: SmtpDeliveryConfig): SmtpMailDelivery {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2" },
  }) as SmtpTransport;

  return new SmtpMailDelivery(transport, {
    MAIL_FROM_ADDRESS: config.fromAddress,
    MAIL_FROM_NAME: config.fromName,
    MAIL_REPLY_TO: config.replyTo,
  });
}
