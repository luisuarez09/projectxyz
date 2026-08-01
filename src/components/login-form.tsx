"use client"

import { ArrowRight, Check, Eye, EyeOff, Info, LockKeyhole, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/modules/identity/infrastructure/auth-client"

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [notice, setNotice] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { email?: string; password?: string } = {}

    if (!email.trim()) nextErrors.email = "Ingresa tu correo de acceso."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Ingresa un correo electrónico válido."

    if (!password) nextErrors.password = "Ingresa tu contraseña."
    else if (password.length < 12) nextErrors.password = "La contraseña debe tener al menos 12 caracteres."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setNotice("")
      return
    }

    setSubmitting(true)
    setNotice("")

    const { data, error } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
      rememberMe: remember,
      callbackURL: "/",
    })

    setSubmitting(false)

    if (error) {
      setNotice("No fue posible iniciar sesión. Revisa tus datos o confirma tu correo de acceso.")
      return
    }

    if (data && !("twoFactorRedirect" in data && data.twoFactorRedirect)) {
      router.replace("/")
      router.refresh()
    }
  }

  return (
    <div>
      <form className="space-y-4" noValidate onSubmit={submit}>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel className="text-stone-800" htmlFor="login-email">Correo de acceso</FieldLabel>
          <span className="relative mt-1.5 block">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <Input aria-describedby={errors.email ? "login-email-error" : undefined} aria-invalid={Boolean(errors.email)} autoComplete="email" className="h-11 border-stone-200 bg-white pl-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" id="login-email" name="email" onChange={(event) => { setEmail(event.target.value); setErrors((current) => ({ ...current, email: undefined })); }} placeholder="nombre@correo.com" required type="email" value={email} />
          </span>
          <FieldError id="login-email-error">{errors.email}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel className="text-stone-800" htmlFor="login-password">Contraseña</FieldLabel>
          <span className="relative mt-1.5 block">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <Input aria-describedby={errors.password ? "login-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="h-11 border-stone-200 bg-white px-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" id="login-password" minLength={12} name="password" onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }} placeholder="Ingresa tu contraseña" required type={showPassword ? "text" : "password"} value={password} />
            <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700" onClick={() => setShowPassword((visible) => !visible)} type="button">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          <FieldError id="login-password-error">{errors.password}</FieldError>
        </Field>

        <label className="flex cursor-pointer items-start gap-3 py-1 text-sm text-stone-600">
          <input checked={remember} className="sr-only" onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
          <span className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded border transition ${remember ? "border-[#14352d] bg-[#14352d] text-white" : "border-stone-300 bg-white"}`}>
            {remember && <Check size={12} strokeWidth={3} />}
          </span>
          <span><strong className="font-medium text-stone-800">Mantener la sesión abierta</strong><span className="mt-0.5 block text-xs text-stone-500">Úsalo sólo en un dispositivo personal.</span></span>
        </label>

        <Button className="h-11 w-full bg-[#14352d] text-white shadow-sm hover:bg-[#0c2720]" disabled={submitting} type="submit">
          {submitting ? "Verificando…" : "Iniciar sesión"} {!submitting && <ArrowRight size={16} />}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        <Link className="font-medium text-[#276252] hover:underline" href="/recuperar-acceso?tipo=usuario">Recuperar usuario</Link>
        <Link className="font-medium text-[#276252] hover:underline" href="/recuperar-acceso?tipo=contrasena">Recuperar contraseña</Link>
      </div>

      {notice && (
        <div className="mt-5 flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900" role="status">
          <Info className="mt-0.5 shrink-0" size={15} /> {notice}
        </div>
      )}

      <div className="mt-7 rounded-xl border border-stone-200 bg-white/70 p-4 text-center text-xs leading-5 text-stone-500">
        Las cuentas son creadas por el administrador de la firma. Si aún no tienes acceso, pídele que te envíe una invitación.
      </div>
    </div>
  )
}
