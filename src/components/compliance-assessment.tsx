"use client"

import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronLeft, CircleAlert, Clock3, FileText, Info, MessageSquareText, Save, Scale, ShieldCheck, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { complianceSections, totalComplianceQuestions } from "@/lib/compliance-demo"

type Answer = "yes" | "no" | "na"
type AnswerState = Record<string, { answer?: Answer; observation?: string }>

const seedAnswers: AnswerState = {
  "gen-01": { answer: "yes" },
  "gen-02": { answer: "yes" },
  "gen-03": { answer: "no", observation: "El período de la junta directiva venció en marzo de 2026." },
  "gen-04": { answer: "yes" },
  "gen-05": { answer: "no" },
}

export function ComplianceAssessment() {
  const [sectionIndex, setSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerState>(seedAnswers)
  const [openNotes, setOpenNotes] = useState<string[]>(["gen-03"])
  const [notice, setNotice] = useState("")
  const section = complianceSections[sectionIndex]
  const answered = Object.values(answers).filter((item) => item.answer).length
  const sectionAnswered = section.questions.filter((item) => answers[item.id]?.answer).length
  const progress = Math.round((answered / totalComplianceQuestions) * 100)

  const draftScore = useMemo(() => {
    let earned = 0
    let applicable = 0
    complianceSections.flatMap((item) => item.questions).forEach((item) => {
      const answer = answers[item.id]?.answer
      if (!answer || answer === "na") return
      applicable += item.weight
      if (answer === "yes") earned += item.weight
    })
    return applicable ? Math.round((earned / applicable) * 100) : 0
  }, [answers])

  function setAnswer(id: string, answer: Answer) {
    setAnswers((current) => ({ ...current, [id]: { ...current[id], answer } }))
  }

  function toggleNote(id: string) {
    setOpenNotes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function saveDraft() {
    setNotice("Borrador guardado en esta demostración. La persistencia real requiere conectar el backend.")
    window.setTimeout(() => setNotice(""), 4000)
  }

  function finish() {
    const missing = totalComplianceQuestions - answered
    setNotice(missing ? `Aún faltan ${missing} respuestas. Puedes guardar el borrador y continuar luego.` : "Evaluación lista para revisión y cierre.")
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {notice && <div className="fixed right-4 top-20 z-50 max-w-md rounded-xl border border-emerald-200 bg-white p-4 text-sm shadow-xl dark:border-emerald-900 dark:bg-stone-900" role="status">{notice}</div>}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
          <div><Link className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900" href="/cumplimiento"><ArrowLeft size={15} /> Evaluaciones</Link><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Evaluación de deberes formales</h1><p className="mt-2 text-sm text-stone-500">Borrador · iniciado hoy por Andrea Castillo</p></div>
          <div className="flex gap-2"><Button onClick={saveDraft} variant="outline"><Save /> Guardar borrador</Button><Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={finish}><ShieldCheck /> Revisar y finalizar</Button></div>
        </div>

        <div className="mt-5 lg:sticky lg:top-16 lg:z-20 lg:-mx-2 lg:bg-[#f7f7f4]/95 lg:px-2 lg:py-3 lg:backdrop-blur-md dark:lg:bg-stone-950/95">
          <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Card className="border-0 shadow-sm"><CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#276252] dark:bg-emerald-950"><Building2 size={18} /></span><div><p className="font-semibold">Distribuidora El Roble, C.A.</p><p className="mt-0.5 text-xs text-stone-500">J-30124567-8 · Municipio Maracaibo, Zulia</p></div></div><div className="flex flex-wrap gap-2"><Badge variant="outline">Contribuyente ordinario IVA</Badge><Badge variant="outline">12 trabajadores</Badge><Badge variant="outline">Comercio</Badge><Badge variant="outline">Máquina fiscal</Badge></div></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-4 pt-4"><div><p className="text-xs text-stone-500">Avance total</p><p className="mt-1 text-xl font-semibold">{answered} / {totalComplianceQuestions}</p></div><div className="h-10 w-px bg-stone-200 dark:bg-stone-700" /><div><p className="text-xs text-stone-500">Índice provisional</p><p className="mt-1 text-xl font-semibold text-amber-700">{draftScore} / 100</p></div></CardContent></Card>
          </section>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"><div className="h-full rounded-full bg-[#276252] transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-[14.25rem] lg:max-h-[calc(100vh-15.25rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1">
              {complianceSections.map((item, index) => {
                const count = item.questions.filter((question) => answers[question.id]?.answer).length
                const active = index === sectionIndex
                const complete = count === item.questions.length
                return <button className={`flex min-w-44 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition lg:w-full ${active ? "bg-[#14352d] text-white shadow-sm" : "text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-900"}`} key={item.id} onClick={() => setSectionIndex(index)} type="button"><span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${active ? "bg-white/15" : complete ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500 dark:bg-stone-800"}`}>{complete ? <Check size={14} /> : index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.shortTitle}</span><span className={`mt-0.5 block text-xs ${active ? "text-emerald-100/75" : "text-stone-400"}`}>{count} de {item.questions.length}</span></span></button>
              })}
            </div>
            <div className="mt-4 hidden rounded-xl border border-stone-200 bg-white p-3 text-xs leading-5 text-stone-500 dark:border-stone-800 dark:bg-stone-900 lg:flex lg:gap-2"><Info className="mt-0.5 shrink-0" size={14} />“No aplica” no suma ni resta y se excluye del cálculo.</div>
          </aside>

          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#276252]">Sección {sectionIndex + 1} de {complianceSections.length}</p><h2 className="mt-2 text-2xl font-semibold">{section.title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">{section.description}</p></div><span className="text-sm text-stone-500">{sectionAnswered} / {section.questions.length} respondidos</span></div>

            <div className="space-y-3">{section.questions.map((item, index) => {
              const state = answers[item.id]
              const noteOpen = openNotes.includes(item.id)
              return <Card className={`border shadow-none transition ${state?.answer === "no" ? "border-rose-200 bg-rose-50/30 dark:border-rose-900 dark:bg-rose-950/10" : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"}`} key={item.id}><CardContent className="pt-4"><div className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-xs font-semibold text-stone-500 dark:bg-stone-800">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><p className="font-medium leading-6">{item.label}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500"><span className="inline-flex items-center gap-1"><Scale size={13} /> {item.source}</span><span>· Peso interno borrador: {item.weight}</span>{item.applicability && <Badge className="font-normal" variant="outline">{item.applicability}</Badge>}</div></div><div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1 dark:bg-stone-800">{(["yes", "no", "na"] as Answer[]).map((answer) => <AnswerButton answer={answer} active={state?.answer === answer} key={answer} onClick={() => setAnswer(item.id, answer)} />)}</div></div><button className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#276252] hover:underline" onClick={() => toggleNote(item.id)} type="button"><MessageSquareText size={14} /> {noteOpen ? "Ocultar observación" : state?.observation ? "Editar observación" : "Agregar observación"}</button>{noteOpen && <textarea className="mt-2 min-h-20 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#276252] focus:ring-3 focus:ring-[#276252]/15 dark:border-stone-700 dark:bg-stone-950" onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: { ...current[item.id], observation: event.target.value } }))} placeholder="Describe la evidencia observada, fecha, responsable o documento pendiente..." value={state?.observation ?? ""} />}</div></div></CardContent></Card>
            })}</div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 dark:border-stone-800 sm:flex-row sm:justify-between"><Button disabled={sectionIndex === 0} onClick={() => setSectionIndex((current) => current - 1)} variant="outline"><ChevronLeft /> Sección anterior</Button>{sectionIndex < complianceSections.length - 1 ? <Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={() => setSectionIndex((current) => current + 1)}>Siguiente sección <ArrowRight /></Button> : <Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={finish}>Revisar evaluación <CheckCircle2 /></Button>}</div>
          </section>
        </div>
      </div>
    </main>
  )
}

function AnswerButton({ answer, active, onClick }: { answer: Answer; active: boolean; onClick: () => void }) {
  const config = { yes: { label: "Sí", icon: Check, active: "bg-emerald-600 text-white" }, no: { label: "No", icon: X, active: "bg-rose-600 text-white" }, na: { label: "N/A", icon: CircleAlert, active: "bg-stone-700 text-white" } }[answer]
  const Icon = config.icon
  return <button aria-pressed={active} className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-semibold transition ${active ? config.active : "bg-transparent text-stone-500 hover:bg-white dark:hover:bg-stone-700"}`} onClick={onClick} type="button"><Icon size={13} />{config.label}</button>
}
