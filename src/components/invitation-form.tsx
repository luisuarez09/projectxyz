"use client"

import { Check, Eye, EyeOff, Info, LockKeyhole, ShieldCheck, X } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const invite = {
  firm: "Firma Contable Suárez & Asociados",
  name: "Daniela Ruiz",
  email: "daniela.ruiz@firma.com",
  role: "Colaboradora",
}

export function InvitationForm() {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const checks = useMemo(() => [
    { label: "12 caracteres o más", valid: password.length >= 12 },
    { label: "Una letra mayúscula y una minúscula", valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "Al menos un número", valid: /\d/.test(password) },
    { label: "Al menos un símbolo", valid: /[^A-Za-z0-9]/.test(password) },
  ], [password])

  const matches = password.length > 0 && password === confirmation
  const valid = checks.every((check) => check.valid) && matches

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (valid) setAccepted(true)
  }

  if (accepted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={25} /></span>
        <h2 className="mt-4 text-xl font-semibold">Tu cuenta está preparada</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">La contraseña cumple los requisitos. Al conectar autenticación, este paso activará la cuenta y cerrará el enlace de invitación.</p>
        <Button className="mt-6 h-11 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" onClick={() => setAccepted(false)} type="button">Volver a revisar</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-semibold text-[#276252]">DR</span>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">{invite.name}</p>
            <p className="truncate text-sm text-stone-500">{invite.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600">{invite.role}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Invitación verificada</span>
            </div>
          </div>
        </div>
        <p className="mt-4 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-500">Invitación enviada por {invite.firm}. Válida por 48 horas y para un solo uso.</p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field>
          <FieldLabel className="text-stone-800" htmlFor="invitation-password">Crea una contraseña</FieldLabel>
          <span className="relative mt-1.5 block">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />
            <Input autoComplete="new-password" className="h-11 border-stone-200 bg-white px-10 shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" id="invitation-password" onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 12 caracteres" required type={showPassword ? "text" : "password"} value={password} />
            <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </span>
        </Field>

        <Field data-invalid={confirmation.length > 0 && !matches}>
          <FieldLabel className="text-stone-800" htmlFor="invitation-confirmation">Confirma la contraseña</FieldLabel>
          <Input aria-describedby={!matches && confirmation.length > 0 ? "invitation-confirmation-error" : undefined} aria-invalid={confirmation.length > 0 && !matches} autoComplete="new-password" className="mt-1.5 h-11 border-stone-200 bg-white shadow-sm focus-visible:border-[#276252] focus-visible:ring-[#276252]/15" id="invitation-confirmation" onChange={(event) => setConfirmation(event.target.value)} placeholder="Escríbela nuevamente" required type={showPassword ? "text" : "password"} value={confirmation} />
          {confirmation.length > 0 && !matches && <FieldError id="invitation-confirmation-error">Las contraseñas no coinciden.</FieldError>}
        </Field>

        <div className="grid gap-2 rounded-xl bg-stone-100/80 p-4 sm:grid-cols-2">
          {checks.map((check) => <Requirement key={check.label} label={check.label} valid={check.valid} />)}
          <Requirement label="Las contraseñas coinciden" valid={matches} />
        </div>

        <Button className="h-11 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" disabled={!valid} type="submit">Aceptar invitación y continuar</Button>
      </form>

      <div className="mt-5 flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
        <Info className="mt-0.5 shrink-0" size={15} /> La firma nunca verá tu contraseña. Si no reconoces esta invitación, no continúes y comunícate con el administrador.
      </div>
    </div>
  )
}

function Requirement({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-emerald-700" : "text-stone-500"}`}>
      <span className={`grid size-4 shrink-0 place-items-center rounded-full ${valid ? "bg-emerald-100" : "bg-stone-200"}`}>{valid ? <Check size={10} strokeWidth={3} /> : <X size={9} />}</span>
      {label}
    </div>
  )
}
