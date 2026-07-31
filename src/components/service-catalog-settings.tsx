"use client";

import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeadlineRuleFields } from "@/components/deadline-rule-fields";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DeadlineRule, emptyDeadlineRule, formatDeadlineRule, isDeadlineConfigured } from "@/lib/deadline-rules";

type Rule = { id: number; type: string; organism: string; deadline: DeadlineRule; active: boolean };
const documentDate: DeadlineRule = { mode: "document-date", dayCount: 0, dayType: "calendar", base: "document-date" };
const municipalDeadline: DeadlineRule = { mode: "days", dayCount: 10, dayType: "business", base: "next-period-start" };
const seed: Rule[] = [
  { id: 1, type: "Electricidad", organism: "Prestador eléctrico", deadline: { ...documentDate }, active: true },
  { id: 2, type: "Agua", organism: "Prestador de agua", deadline: { ...documentDate }, active: true },
  { id: 3, type: "Publicidad", organism: "Alcaldía aplicable", deadline: { ...municipalDeadline }, active: false },
  { id: 4, type: "Gas", organism: "Prestador de gas", deadline: { ...documentDate }, active: true },
  { id: 5, type: "Aseo urbano", organism: "Alcaldía aplicable", deadline: { ...municipalDeadline }, active: false },
];

export function ServiceCatalogSettings() {
  const [rules, setRules] = useState(seed);
  const [draft, setDraft] = useState<Rule | null>(null);
  const [removing, setRemoving] = useState<Rule | null>(null);
  const save = () => {
    if (!draft || !draft.type || !draft.organism || !isDeadlineConfigured(draft.deadline)) return;
    if (draft.id) setRules((items) => items.map((item) => item.id === draft.id ? draft : item));
    else setRules((items) => [...items, { ...draft, id: Date.now(), active: true }]);
    setDraft(null);
  };

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10"><div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-stone-500">Configuración de la firma</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Servicios</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Define si el vencimiento se cuenta en días hábiles o continuos, o si se toma directamente de la factura. Las empresas solo habilitan los servicios que les aplican.</p></div><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" onClick={() => setDraft({ id: 0, type: "", organism: "", deadline: { ...emptyDeadlineRule }, active: true })} type="button"><Plus size={16} /> Crear servicio</button></div>
    <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100"><p className="font-semibold">Reglas listas para alimentar el calendario</p><p className="mt-1 leading-5">Los servicios de alcaldía se muestran con un ejemplo configurable de 10 días hábiles. Los servicios facturados pueden usar la fecha indicada por el prestador.</p></section>
    <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Reglas disponibles</h2><p className="mt-1 text-sm text-stone-500">Cantidad, tipo de día y punto de partida se guardan por separado.</p></div><div className="overflow-x-auto"><Table className="min-w-[760px] w-full text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="px-5 py-3">Tipo de servicio</TableHead><TableHead className="px-3 py-3">Organismo</TableHead><TableHead className="px-3 py-3">Cálculo del vencimiento</TableHead><TableHead className="px-3 py-3">Estado</TableHead><TableHead className="px-5 py-3" /></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{rules.map((rule) => <TableRow key={rule.id}><TableCell className="px-5 py-4 font-medium">{rule.type}</TableCell><TableCell className="px-3 py-4">{rule.organism}</TableCell><TableCell className="px-3 py-4"><span className="inline-flex items-start gap-1.5"><CalendarDays size={15} className="mt-0.5 shrink-0 text-stone-400" />{formatDeadlineRule(rule.deadline)}</span></TableCell><TableCell className="px-3 py-4"><button className={`rounded-full px-2.5 py-1 text-xs font-medium ${rule.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`} onClick={() => setRules((items) => items.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} type="button">{rule.active ? "Habilitado" : "Deshabilitado"}</button></TableCell><TableCell className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label={`Editar ${rule.type}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] dark:hover:bg-stone-800" onClick={() => setDraft({ ...rule, deadline: { ...rule.deadline } })} type="button"><Pencil size={15} /></button><button aria-label={`Eliminar ${rule.type}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={() => setRemoving(rule)} type="button"><Trash2 size={15} /></button></div></TableCell></TableRow>)}</TableBody></Table></div></section>
    {draft && <RuleForm draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} />}
    {removing && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4"><section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><h2 className="text-lg font-semibold">¿Eliminar servicio?</h2><p className="mt-2 text-sm leading-6 text-stone-500">Eliminarás <span className="font-medium text-stone-800 dark:text-stone-200">{removing.type}</span> del catálogo.</p><div className="mt-6 flex justify-end gap-2"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100" onClick={() => setRemoving(null)} type="button">Cancelar</button><button className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white" onClick={() => { setRules((items) => items.filter((item) => item.id !== removing.id)); setRemoving(null); }} type="button">Eliminar servicio</button></div></section></div>}
  </div>;
}

function RuleForm({ draft, onChange, onClose, onSave }: { draft: Rule; onChange: (value: Rule) => void; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/35 p-4"><section className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><h2 className="text-lg font-semibold">{draft.id ? "Editar servicio" : "Crear servicio"}</h2><p className="mt-1 text-sm text-stone-500">La regla producirá la fecha tope que verán el calendario y los compromisos.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Tipo de servicio<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, type: event.target.value })} placeholder="Ej. Electricidad" value={draft.type} /></label><label className="field-label">Organismo<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, organism: event.target.value })} placeholder="Ej. Prestador eléctrico" value={draft.organism} /></label><DeadlineRuleFields allowDocumentDate onChange={(deadline) => onChange({ ...draft, deadline })} value={draft.deadline} /></div><div className="mt-6 flex justify-end gap-2"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100" onClick={onClose} type="button">Cancelar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!draft.type || !draft.organism || !isDeadlineConfigured(draft.deadline)} onClick={onSave} type="button"><Check size={16} /> Guardar regla</button></div></section></div>;
}
