import type { Metadata } from "next"

import { AuthShell } from "@/components/auth-shell"
import { InvitationForm } from "@/components/invitation-form"

export const metadata: Metadata = {
  title: "Aceptar invitación | proyectoxyz",
}

export default function InvitationPage() {
  return (
    <AuthShell
      description="Confirma los datos de la invitación y crea una contraseña segura para activar tu acceso."
      eyebrow="Invitación al equipo"
      title="Crea tu acceso"
    >
      <InvitationForm />
    </AuthShell>
  )
}
