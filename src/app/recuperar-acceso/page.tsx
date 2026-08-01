import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthShell } from "@/components/auth-shell"
import { RecoveryForm } from "@/components/recovery-form"

export const metadata: Metadata = {
  title: "Recuperar acceso | proyectoxyz",
}

export default function RecoveryPage() {
  return (
    <AuthShell
      description="Elige qué dato necesitas recuperar. Para proteger tu cuenta, verificaremos la solicitud sin revelar si un usuario existe."
      eyebrow="Ayuda de acceso"
      title="Recupera tu cuenta"
    >
      <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-stone-200/60" />}>
        <RecoveryForm />
      </Suspense>
    </AuthShell>
  )
}
