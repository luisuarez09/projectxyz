"use client"

import { CheckCircle2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState, type FormEvent } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/modules/identity/infrastructure/auth-client"

export function PasswordResetForm() {
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState("")

  const valid = useMemo(
    () =>
      password.length >= 12 &&
      password.length <= 128 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password) &&
      password === confirmation,
    [confirmation, password],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !valid) return

    setSubmitting(true)
    setError("")
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    setSubmitting(false)

    if (result.error) {
      setError("El enlace no es válido o ya venció. Solicita uno nuevo.")
      return
    }

    setComplete(true)
  }

  if (complete) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-emerald-700" size={32} />
        <h2 className="mt-4 text-lg font-semibold">Contraseña actualizada</h2>
        <p className="mt-2 text-sm text-stone-600">Tus otras sesiones fueron revocadas por seguridad.</p>
        <Link className={buttonVariants({ className: "mt-6 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" })} href="/login">Ir a iniciar sesión</Link>
      </div>
    )
  }

  if (!token) {
    return <InvalidLink />
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-sm font-medium text-stone-800">Nueva contraseña
        <span className="relative mt-1.5 block">
          <Input autoComplete="new-password" className="h-11 bg-white pr-10" maxLength={128} minLength={12} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={password} />
          <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-stone-500" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </span>
      </label>
      <label className="block text-sm font-medium text-stone-800">Confirmar contraseña
        <Input autoComplete="new-password" className="mt-1.5 h-11 bg-white" maxLength={128} minLength={12} onChange={(event) => setConfirmation(event.target.value)} required type={showPassword ? "text" : "password"} value={confirmation} />
      </label>
      <p className="text-xs leading-5 text-stone-500">Usa entre 12 y 128 caracteres, con mayúsculas, minúsculas, un número y un símbolo.</p>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <Button className="h-11 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" disabled={!valid || submitting} type="submit">{submitting ? "Actualizando…" : "Guardar contraseña"}</Button>
    </form>
  )
}

function InvalidLink() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold">Enlace incompleto</h2>
      <p className="mt-2 text-sm text-stone-600">Solicita un enlace nuevo para continuar.</p>
      <Link className={buttonVariants({ className: "mt-6 w-full", variant: "outline" })} href="/recuperar-acceso?tipo=contrasena">Solicitar enlace</Link>
    </div>
  )
}
