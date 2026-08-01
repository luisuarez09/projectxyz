import { describe, expect, it, vi } from "vitest";

import { SmtpMailDelivery } from "@/infrastructure/mail/smtp-mail-delivery";

describe("SmtpMailDelivery", () => {
  it("aplica el remitente configurado y conserva un reply-to explícito", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "mailrelay-id" });
    const delivery = new SmtpMailDelivery(
      { sendMail, verify: vi.fn() },
      {
        MAIL_FROM_ADDRESS: "acceso@example.test",
        MAIL_FROM_NAME: "proyectoxyz",
        MAIL_REPLY_TO: "soporte@example.test",
      },
    );

    await expect(
      delivery.send({
        to: "persona@example.test",
        subject: "Prueba",
        text: "Mensaje",
        replyTo: "administracion@example.test",
      }),
    ).resolves.toEqual({ providerMessageId: "mailrelay-id" });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: { address: "acceso@example.test", name: "proyectoxyz" },
        replyTo: "administracion@example.test",
      }),
    );
  });
});
