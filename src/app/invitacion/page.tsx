import type { Metadata } from "next"

import { AuthShell } from "@/components/auth-shell"
import { InvitationForm } from "@/components/invitation-form"
import { validateInvitationToken } from "@/modules/identity/application/invitations"

export const metadata: Metadata = {
  title: "Aceptar invitación | proyectoxyz",
}

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? ""
  const invitation = await validateInvitationToken(token)

  return (
    <AuthShell
      description="Confirma los datos de la invitación y crea una contraseña segura para activar tu acceso."
      eyebrow="Invitación al equipo"
      title="Crea tu acceso"
    >
      <InvitationForm
        invitation={invitation ? {
          ...invitation,
          expiresAt: invitation.expiresAt.toISOString(),
        } : null}
        token={token}
      />
    </AuthShell>
  )
}
