import type { Metadata } from "next"

import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Iniciar sesión | proyectoxyz",
  description: "Accede a tu firma o a las empresas que tienes autorizadas.",
}

export default function LoginPage() {
  return (
    <AuthShell
      description="Accede con el método asociado a la invitación que recibiste. Tus empresas y funciones aparecerán según tus permisos."
      eyebrow="Bienvenido"
      title="Inicia sesión en tu cuenta"
    >
      <LoginForm />
    </AuthShell>
  )
}
