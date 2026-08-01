"use client"

import { ArrowLeft, ArrowRight, Building2, CheckCircle2, KeyRound, Mail, UserRound } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type RecoveryMode = "usuario" | "contrasena"

export function RecoveryForm() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<RecoveryMode>(searchParams.get("tipo") === "usuario" ? "usuario" : "contrasena")
  const [sent, setSent] = useState(false)

  function selectMode(nextMode: RecoveryMode) {
    setMode(nextMode)
    setSent(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={24} /></span>
        <h2 className="mt-4 text-lg font-semibold text-stone-900">Revisa tu correo</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
          {mode === "contrasena"
            ? "Si existe una cuenta activa con esos datos, recibirás un enlace temporal para crear una nueva contraseña."
            : "La solicitud será revisada por el administrador de la firma antes de confirmar tu correo de acceso."}
        </p>
        <p className="mt-3 text-xs leading-5 text-stone-500">Por seguridad, la pantalla no confirma si una cuenta existe.</p>
        <Button className="mt-6 h-10 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" onClick={() => setSent(false)} type="button">Enviar otra solicitud</Button>
        <Link className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#276252] hover:underline" href="/login"><ArrowLeft size={14} /> Volver al inicio de sesión</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 rounded-xl bg-stone-200/70 p-1" aria-label="Tipo de recuperación">
        <button className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${mode === "usuario" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`} onClick={() => selectMode("usuario")} type="button">Recuperar usuario</button>
        <button className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${mode === "contrasena" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`} onClick={() => selectMode("contrasena")} type="button">Recuperar contraseña</button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode === "usuario" ? (
          <>
            <p className="text-sm leading-6 text-stone-600">Si no recuerdas el correo con el que fuiste invitado, solicita una verificación al administrador de tu firma.</p>
            <Field icon={UserRound} label="Nombre completo">
              <Input autoComplete="name" className="h-11 border-stone-200 bg-white pl-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" name="name" placeholder="Como aparece en tu invitación" required />
            </Field>
            <Field icon={Building2} label="Firma o empresa relacionada">
              <Input className="h-11 border-stone-200 bg-white pl-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" name="organization" placeholder="Nombre de la firma o empresa" required />
            </Field>
            <Field icon={Mail} label="Correo donde podemos contactarte">
              <Input autoComplete="email" className="h-11 border-stone-200 bg-white pl-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" name="contactEmail" placeholder="correo@ejemplo.com" required type="email" />
            </Field>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-stone-600">Te enviaremos un enlace de un solo uso. El enlace vencerá y no permitirá consultar tu contraseña anterior.</p>
            <Field icon={Mail} label="Correo de acceso">
              <Input autoComplete="email" className="h-11 border-stone-200 bg-white pl-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" name="email" placeholder="nombre@correo.com" required type="email" />
            </Field>
          </>
        )}

        <Button className="h-11 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" type="submit">
          {mode === "usuario" ? "Solicitar verificación" : "Enviar enlace seguro"} <ArrowRight size={16} />
        </Button>
      </form>

      <Link className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-[#276252] hover:underline" href="/login"><ArrowLeft size={14} /> Volver al inicio de sesión</Link>

      <div className="mt-7 flex gap-3 rounded-xl border border-stone-200 bg-white/70 p-4 text-xs leading-5 text-stone-500">
        <KeyRound className="mt-0.5 shrink-0 text-stone-400" size={16} /> Ningún integrante de la firma debe pedirte tu contraseña por correo, llamada o mensajería.
      </div>
    </div>
  )
}

function Field({ children, icon: Icon, label }: { children: React.ReactNode; icon: typeof Mail; label: string }) {
  return (
    <label className="block text-sm font-medium text-stone-800">
      {label}
      <span className="relative mt-1.5 block">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-stone-400" size={17} />
        {children}
      </span>
    </label>
  )
}
