import { describe, expect, it } from "vitest";

import {
  invitationEmail,
  passwordResetEmail,
} from "@/modules/identity/application/identity-mail-templates";

describe("plantillas de identidad", () => {
  it("incluye una invitación legible y escapa datos en HTML", () => {
    const message = invitationEmail({
      to: "persona@example.test",
      name: "Ana <Administradora>",
      firmName: "Firma & Asociados",
      url: "https://app.example.test/invitacion?token=abc&source=test",
    });

    expect(message.subject).toContain("Firma & Asociados");
    expect(message.text).toContain("https://app.example.test/invitacion");
    expect(message.html).toContain("Ana &lt;Administradora&gt;");
    expect(message.html).toContain("token=abc&amp;source=test");
    expect(message.html).not.toContain("Ana <Administradora>");
  });

  it("no revela si la cuenta existe en el contenido de recuperación", () => {
    const message = passwordResetEmail({
      to: "persona@example.test",
      name: "Ana",
      url: "https://app.example.test/restablecer?token=abc",
    });

    expect(message.subject).toBe("Restablece tu contraseña");
    expect(message.text).not.toMatch(/usuario existe|cuenta existe/i);
  });
});
