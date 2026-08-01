import type { Metadata } from "next"

import { AuthShell } from "@/components/auth-shell"
import { TwoFactorChallengeForm } from "@/components/two-factor-challenge-form"

export const metadata: Metadata = {
  title: "Verificar segundo factor | proyectoxyz",
}

export default function TwoFactorChallengePage() {
  return (
    <AuthShell
      description="Confirma el código de tu aplicación autenticadora para completar el inicio de sesión."
      eyebrow="Protección de la cuenta"
      title="Verificación en dos pasos"
    >
      <TwoFactorChallengeForm />
    </AuthShell>
  )
}
