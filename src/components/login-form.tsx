"use client"

import { ArrowRight, Check, Eye, EyeOff, Info, LockKeyhole, Mail } from "lucide-react"
import Link from "next/link"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [notice, setNotice] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { email?: string; password?: string } = {}

    if (!email.trim()) nextErrors.email = "Ingresa tu correo de acceso."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Ingresa un correo electrónico válido."

    if (!password) nextErrors.password = "Ingresa tu contraseña."
    else if (password.length < 8) nextErrors.password = "La contraseña debe tener al menos 8 caracteres."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setNotice("")
      return
    }

    setNotice("Acceso preparado. La validación de credenciales se habilitará al conectar autenticación.")
  }

  function social(provider: "Google" | "Facebook") {
    setNotice(`Continuar con ${provider} requiere conectar ese proveedor de identidad.`)
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="h-11 border-stone-200 bg-white text-stone-800 shadow-sm hover:bg-stone-50" onClick={() => social("Google")} type="button" variant="outline">
          <GoogleMark /> Continuar con Google
        </Button>
        <Button className="h-11 border-stone-200 bg-white text-stone-800 shadow-sm hover:bg-stone-50" onClick={() => social("Facebook")} type="button" variant="outline">
          <FacebookMark /> Continuar con Facebook
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
        <span className="h-px flex-1 bg-stone-200" /> o usa tu correo <span className="h-px flex-1 bg-stone-200" />
      </div>

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
            <Input aria-describedby={errors.password ? "login-password-error" : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="h-11 border-stone-200 bg-white px-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" id="login-password" minLength={8} name="password" onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }} placeholder="Ingresa tu contraseña" required type={showPassword ? "text" : "password"} value={password} />
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

        <Button className="h-11 w-full bg-[#14352d] text-white shadow-sm hover:bg-[#0c2720]" type="submit">
          Iniciar sesión <ArrowRight size={16} />
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

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.74 2.981-4.304 2.981-7.35Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.964-.895 6.619-2.423l-3.232-2.509c-.895.6-2.04.955-3.387.955-2.605 0-4.81-1.76-5.6-4.123H3.06v2.59A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.4 13.9A6.02 6.02 0 0 1 6.086 12c0-.66.114-1.3.314-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.614.386 3.141 1.06 4.49L6.4 13.9Z" fill="#FBBC05" />
      <path d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.99 14.696 2 12 2a10 10 0 0 0-8.94 5.51L6.4 10.1c.79-2.364 2.995-4.123 5.6-4.123Z" fill="#EA4335" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="#1877F2" r="11" />
      <path d="M15.9 15.18 16.39 12h-3.05V9.94c0-.87.43-1.72 1.8-1.72h1.39V5.51s-1.26-.22-2.47-.22c-2.52 0-4.17 1.53-4.17 4.3V12H7.08v3.18h2.81v7.69a11.2 11.2 0 0 0 3.45 0v-7.69h2.56Z" fill="white" />
    </svg>
  )
}
