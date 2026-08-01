"use client"

import { AlertTriangle, BellRing, Building2, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, Filter, Info, MoreHorizontal, Plus, Search, Settings2, ShieldAlert, UserRound } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { ComplianceScore, ScoreScale, scoreBand } from "@/components/compliance-score"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { totalComplianceQuestions } from "@/lib/compliance-demo"

const evaluations = [
  { id: "el-roble-2026", company: "Distribuidora El Roble, C.A.", rif: "J-30124567-8", score: 68, status: "Seguimiento", progress: "62/62", date: "29 jul 2026", owner: "María Pérez", findings: 14 },
  { id: "costa-azul-2026", company: "Inversiones Costa Azul, C.A.", rif: "J-41239087-2", score: 87, status: "Finalizada", progress: "58/58", date: "18 jul 2026", owner: "José Torres", findings: 5 },
  { id: "maracay-borrador", company: "Servicios Maracay, C.A.", rif: "J-29764012-1", score: 0, status: "Borrador", progress: "31/55", date: "Hoy · 10:24 a. m.", owner: "Andrea Castillo", findings: 0 },
  { id: "confiteria-2026", company: "Nueva Confitería del Sur, C.A.", rif: "J-30995144-0", score: 54, status: "Seguimiento", progress: "60/60", date: "04 jul 2026", owner: "Carlos Rojas", findings: 21 },
]

const findings = [
  { company: "Nueva Confitería del Sur, C.A.", item: "Licencia de actividades económicas vencida", severity: "Crítica", due: "Vence hoy", owner: "Carlos Rojas" },
  { company: "Distribuidora El Roble, C.A.", item: "Libro auxiliar de ventas con atraso", severity: "Alta", due: "02 ago", owner: "María Pérez" },
  { company: "Distribuidora El Roble, C.A.", item: "Solvencia FAOV pendiente", severity: "Alta", due: "05 ago", owner: "José Torres" },
]

export function ComplianceOverview() {
  const [query, setQuery] = useState("")
  const rows = useMemo(() => evaluations.filter((item) => `${item.company} ${item.rif} ${item.owner} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm text-stone-500">Firma / Cumplimiento</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cumplimiento formal</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Evalúa preventivamente los deberes formales de cada empresa, documenta hallazgos y acompaña su subsanación.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button render={<Link href="/cumplimiento/configuracion" />} variant="outline"><Settings2 /> Configurar metodología</Button><Button className="bg-[#14352d] hover:bg-[#0e2821]" render={<Link href="/cumplimiento/nueva" />}><Plus /> Nueva evaluación</Button></div>
        </div>

        <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><ShieldAlert className="mt-0.5 shrink-0" size={19} /><div><p className="font-semibold">Metodología legal en revisión</p><p className="mt-1 leading-5 text-amber-900/80 dark:text-amber-100/80">El catálogo inicial proviene del archivo suministrado. Cada pregunta, sanción y condición deberá aprobarse con fuente oficial, artículo, jurisdicción y vigencia antes de emitir informes definitivos.</p></div></div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={ClipboardCheck} label="Evaluaciones activas" value="8" note="3 en borrador" tone="sky" />
          <Metric icon={ShieldAlert} label="Hallazgos abiertos" value="40" note="9 de severidad crítica" tone="rose" />
          <Metric icon={BellRing} label="Recordatorios" value="6" note="2 vencen hoy" tone="amber" />
          <Metric icon={CheckCircle2} label="Debilidades subsanadas" value="23" note="Últimos 30 días" tone="emerald" />
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.92fr_1.4fr]">
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Preparación de la cartera</CardTitle><CardDescription>Promedio de evaluaciones finalizadas</CardDescription></CardHeader><CardContent className="grid gap-6 sm:grid-cols-[10rem_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[10rem_1fr]"><ComplianceScore compact score={73} /><div><ScoreScale /><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800"><p className="text-xs text-stone-500">Empresas evaluadas</p><p className="mt-1 text-lg font-semibold">12 de 18</p></div><div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800"><p className="text-xs text-stone-500">Actualización</p><p className="mt-1 text-sm font-semibold">Hoy · 10:24 a. m.</p></div></div></div></CardContent></Card>

          <Card className="border-0 shadow-sm"><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Requiere atención</CardTitle><CardDescription className="mt-1">Hallazgos con seguimiento próximo</CardDescription></div><Button size="sm" variant="ghost">Ver todos <ChevronRight /></Button></CardHeader><CardContent className="pt-1"><div className="divide-y divide-stone-100 dark:divide-stone-800">{findings.map((finding) => <div className="flex flex-col gap-3 py-4 first:pt-1 sm:flex-row sm:items-center sm:justify-between" key={finding.item}><div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950"><AlertTriangle size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{finding.item}</p><p className="mt-1 truncate text-xs text-stone-500">{finding.company}</p></div></div><div className="flex items-center gap-3 pl-12 sm:pl-0"><div className="text-right"><p className="text-xs font-medium text-rose-700">{finding.due}</p><p className="mt-1 text-xs text-stone-500">{finding.owner}</p></div><Badge className="border-rose-200 bg-rose-50 text-rose-700" variant="outline">{finding.severity}</Badge></div></div>)}</div></CardContent></Card>
        </section>

        <Card className="mt-6 border-0 shadow-sm">
          <CardHeader className="gap-4 border-b border-stone-100 dark:border-stone-800 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle>Evaluaciones</CardTitle><CardDescription className="mt-1">Historial y borradores de todas las empresas</CardDescription></div><div className="flex w-full gap-2 lg:w-auto"><div className="relative flex-1 lg:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} /><Input className="h-9 bg-white pl-9 dark:bg-stone-900" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, RIF o responsable..." value={query} /></div><Button aria-label="Filtrar evaluaciones" size="icon-lg" variant="outline"><Filter /></Button></div></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/50"><tr><th className="px-5 py-3 font-medium">Empresa</th><th className="px-4 py-3 font-medium">Resultado</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Hallazgos</th><th className="px-4 py-3 font-medium">Actualización</th><th className="px-4 py-3 font-medium">Responsable</th><th className="px-5 py-3 text-right font-medium">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100 dark:divide-stone-800">{rows.map((evaluation) => <EvaluationRow evaluation={evaluation} key={evaluation.id} />)}</tbody></table></div><div className="flex items-center justify-between border-t border-stone-100 px-5 py-3 text-xs text-stone-500 dark:border-stone-800"><span>Mostrando {rows.length} de {evaluations.length}</span><span>Catálogo inicial · {totalComplianceQuestions} parámetros</span></div></CardContent>
        </Card>

        <div className="mt-5 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"><Info className="mt-0.5 shrink-0" size={16} /><p>El índice es una herramienta interna de priorización. No garantiza ausencia de incumplimientos o sanciones y no sustituye una revisión jurídica, tributaria, laboral o municipal especializada.</p></div>
      </div>
    </main>
  )
}

function EvaluationRow({ evaluation }: { evaluation: (typeof evaluations)[number] }) {
  const isDraft = evaluation.status === "Borrador"
  const band = scoreBand(evaluation.score)
  const href = isDraft ? "/cumplimiento/nueva" : `/cumplimiento/evaluaciones/${evaluation.id}`
  const statusStyle = isDraft ? "border-stone-200 bg-stone-100 text-stone-600" : evaluation.status === "Finalizada" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-sky-200 bg-sky-50 text-sky-700"
  return <tr className="transition hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Building2 size={16} /></span><div><Link className="font-semibold hover:underline" href={href}>{evaluation.company}</Link><p className="mt-0.5 text-xs text-stone-500">{evaluation.rif} · {evaluation.progress} respuestas</p></div></div></td><td className="px-4 py-4">{isDraft ? <span className="text-xs text-stone-400">Al finalizar</span> : <div className="flex items-center gap-2"><span className={`text-xl font-semibold ${band.text}`}>{evaluation.score}</span><span className="text-xs text-stone-500">/ 100</span></div>}</td><td className="px-4 py-4"><Badge className={statusStyle} variant="outline">{evaluation.status}</Badge></td><td className="px-4 py-4"><span className={evaluation.findings ? "font-semibold text-rose-700" : "text-stone-400"}>{evaluation.findings || "—"}</span></td><td className="px-4 py-4 text-xs text-stone-500"><CalendarClock className="mr-1.5 inline" size={14} />{evaluation.date}</td><td className="px-4 py-4"><span className="inline-flex items-center gap-2 text-xs"><UserRound className="text-stone-400" size={14} />{evaluation.owner}</span></td><td className="px-5 py-4 text-right"><Button render={<Link href={href} />} size="sm" variant="ghost">{isDraft ? "Continuar" : "Abrir"} <ChevronRight /></Button><Button aria-label={`Más acciones de ${evaluation.company}`} size="icon-sm" variant="ghost"><MoreHorizontal /></Button></td></tr>
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof ClipboardCheck; label: string; value: string; note: string; tone: "sky" | "rose" | "amber" | "emerald" }) {
  const styles = { sky: "bg-sky-50 text-sky-600 dark:bg-sky-950", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950", emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" }
  return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{note}</p></div><span className={`grid size-9 place-items-center rounded-lg ${styles[tone]}`}><Icon size={18} /></span></CardContent></Card>
}
