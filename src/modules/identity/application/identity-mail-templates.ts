import type { MailMessage } from "@/infrastructure/mail/mail-delivery";

type IdentityTemplateInput = {
  to: string;
  name: string;
  url: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function actionEmail(input: {
  to: string;
  name: string;
  subject: string;
  heading: string;
  introduction: string;
  actionLabel: string;
  url: string;
  expiresText: string;
}): MailMessage {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.url);

  return {
    to: input.to,
    subject: input.subject,
    text: [
      `Hola, ${input.name}.`,
      "",
      input.introduction,
      input.url,
      "",
      input.expiresText,
      "Si no solicitaste esta acción, ignora este mensaje y contacta a la firma.",
    ].join("\n"),
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f7f7f4;color:#292524;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px"><tr><td style="padding:28px"><p style="margin:0 0 18px;color:#276252;font-size:13px;font-weight:700">proyectoxyz</p><h1 style="margin:0 0 16px;font-size:24px">${escapeHtml(input.heading)}</h1><p style="margin:0 0 14px;line-height:1.6">Hola, ${safeName}.</p><p style="margin:0 0 22px;line-height:1.6">${escapeHtml(input.introduction)}</p><p style="margin:0 0 22px"><a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#14352d;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">${escapeHtml(input.actionLabel)}</a></p><p style="margin:0 0 8px;color:#78716c;font-size:13px;line-height:1.5">${escapeHtml(input.expiresText)}</p><p style="margin:0;color:#78716c;font-size:13px;line-height:1.5">Si no solicitaste esta acción, ignora este mensaje y contacta a la firma.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function invitationEmail(input: IdentityTemplateInput & { firmName: string }): MailMessage {
  return actionEmail({
    ...input,
    subject: `Invitación de ${input.firmName} a proyectoxyz`,
    heading: "Crea tu acceso",
    introduction: `${input.firmName} te invitó a acceder a proyectoxyz. Usa el enlace de un solo uso para crear tu contraseña.`,
    actionLabel: "Aceptar invitación",
    expiresText: "El enlace vence en 48 horas y sólo puede utilizarse una vez.",
  });
}

export function verificationEmail(input: IdentityTemplateInput): MailMessage {
  return actionEmail({
    ...input,
    subject: "Verifica tu correo de acceso",
    heading: "Confirma tu correo",
    introduction: "Confirma que esta dirección de correo te pertenece para completar la activación de tu cuenta.",
    actionLabel: "Verificar correo",
    expiresText: "El enlace es temporal y de un solo uso.",
  });
}

export function passwordResetEmail(input: IdentityTemplateInput): MailMessage {
  return actionEmail({
    ...input,
    subject: "Restablece tu contraseña",
    heading: "Crea una nueva contraseña",
    introduction: "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
    actionLabel: "Restablecer contraseña",
    expiresText: "El enlace vence en una hora y sólo puede utilizarse una vez.",
  });
}
