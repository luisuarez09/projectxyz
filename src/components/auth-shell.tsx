import { Check, LockKeyhole, ShieldCheck } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

type AuthShellProps = {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
}

const assurances = [
  "Un solo acceso para la firma y sus empresas",
  "Permisos definidos por rol y empresa",
  "Actividad preparada para trazabilidad",
]

export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[#f4f5f1] text-stone-900 lg:grid lg:grid-cols-[minmax(22rem,0.82fr)_minmax(36rem,1.18fr)]">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-[#102f28] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div aria-hidden="true" className="absolute -right-40 -top-36 size-[34rem] rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-16 -top-16 size-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-44 -left-40 size-[30rem] rounded-full bg-emerald-200/5" />

        <Link className="relative flex w-fit items-center gap-3" href="/login" aria-label="proyectoxyz, inicio de sesión">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-sm font-bold text-[#14352d] shadow-lg shadow-black/10">PX</span>
          <span>
            <span className="block text-base font-semibold tracking-tight">proyectoxyz</span>
            <span className="block text-xs text-emerald-100/70">Gestión para firmas contables</span>
          </span>
        </Link>

        <div className="relative max-w-xl py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-50">
            <ShieldCheck size={14} /> Acceso con contexto y control
          </span>
          <h2 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.035em] xl:text-5xl">
            Tu operación contable, en el contexto correcto.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-emerald-50/65">
            El mismo acceso reconoce si perteneces al equipo de la firma o si eres un usuario autorizado de una empresa.
          </p>

          <ul className="mt-9 space-y-4">
            {assurances.map((assurance) => (
              <li className="flex items-center gap-3 text-sm text-emerald-50/85" key={assurance}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-200/10 text-emerald-200">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                {assurance}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-emerald-50/50">
          <LockKeyhole size={14} /> Tus credenciales son privadas y cifradas al conectar autenticación.
        </div>
      </aside>

      <section className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:hidden">
          <Link className="flex items-center gap-2.5" href="/login">
            <span className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-xs font-bold text-white">PX</span>
            <span className="font-semibold tracking-tight">proyectoxyz</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500"><LockKeyhole size={13} /> Acceso seguro</span>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-14 xl:px-24">
          <div className="w-full max-w-[29rem]">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#276252]">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-stone-950 sm:text-[2.1rem]">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
            </div>
            {children}
          </div>
        </div>

        <footer className="px-5 py-5 text-center text-xs text-stone-500 sm:px-8">
          © 2026 proyectoxyz · Privacidad · Seguridad
        </footer>
      </section>
    </main>
  )
}
