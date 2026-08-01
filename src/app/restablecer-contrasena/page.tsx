import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthShell } from "@/components/auth-shell"
import { PasswordResetForm } from "@/components/password-reset-form"

export const metadata: Metadata = {
  title: "Restablecer contraseña | proyectoxyz",
}

export default function PasswordResetPage() {
  return (
    <AuthShell
      description="Crea una contraseña nueva. El enlace es temporal y deja de funcionar después de utilizarlo."
      eyebrow="Recuperación segura"
      title="Restablece tu contraseña"
    >
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-stone-200/60" />}>
        <PasswordResetForm />
      </Suspense>
    </AuthShell>
  )
}
