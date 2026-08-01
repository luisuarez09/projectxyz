"use client"

import { KeyRound, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/modules/identity/infrastructure/auth-client"

export function TwoFactorChallengeForm() {
  const router = useRouter()
  const [method, setMethod] = useState<"totp" | "backup">("totp")
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim()) return

    setSubmitting(true)
    setError("")
    const result = method === "totp"
      ? await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice })
      : await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })
    setSubmitting(false)

    if (result.error) {
      setError("El código no es válido o la verificación venció.")
      return
    }

    router.replace("/")
    router.refresh()
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid grid-cols-2 rounded-xl bg-stone-200/70 p-1">
        <button className={`rounded-lg px-3 py-2.5 text-sm font-medium ${method === "totp" ? "bg-white shadow-sm" : "text-stone-500"}`} onClick={() => { setMethod("totp"); setCode(""); setError("") }} type="button">Aplicación</button>
        <button className={`rounded-lg px-3 py-2.5 text-sm font-medium ${method === "backup" ? "bg-white shadow-sm" : "text-stone-500"}`} onClick={() => { setMethod("backup"); setCode(""); setError("") }} type="button">Código de respaldo</button>
      </div>

      <label className="block text-sm font-medium text-stone-800">
        {method === "totp" ? "Código de 6 dígitos" : "Código de respaldo"}
        <span className="relative mt-1.5 block">
          {method === "totp" ? <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} /> : <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={17} />}
          <Input autoComplete="one-time-code" autoFocus className="h-12 bg-white pl-10 text-center text-lg tracking-[0.2em]" inputMode={method === "totp" ? "numeric" : "text"} maxLength={method === "totp" ? 6 : 32} onChange={(event) => setCode(event.target.value)} required value={code} />
        </span>
      </label>

      <label className="flex items-center gap-3 text-sm text-stone-600">
        <input checked={trustDevice} className="size-4 accent-[#14352d]" onChange={(event) => setTrustDevice(event.target.checked)} type="checkbox" />
        Confiar en este dispositivo personal durante 30 días
      </label>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}

      <Button className="h-11 w-full bg-[#14352d] text-white hover:bg-[#0c2720]" disabled={submitting || !code.trim()} type="submit">{submitting ? "Verificando…" : "Verificar y continuar"}</Button>
      <Link className="block text-center text-sm font-medium text-[#276252] hover:underline" href="/login">Volver al inicio de sesión</Link>
    </form>
  )
}
