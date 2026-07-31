"use client";;
import { CalendarDays, Check, ExternalLink, FileCheck2, Pencil, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type TemplateId = "iva" | "dpp" | "inces" | "ivss" | "faov" | "none";
type TaxRule = {
  id: number;
  name: string;
  organism: string;
  frequency: string;
  deadlineRule: string;
  template: TemplateId;
  source: string;
  effectiveFrom: string;
  active: boolean;
};

const templates: { id: TemplateId; label: string; href?: string }[] = [
  { id: "iva", label: "IVA", href: "/declaraciones/iva" },
  { id: "dpp", label: "DPP", href: "/declaraciones/dpp" },
  { id: "inces", label: "INCES", href: "/declaraciones/inces" },
  { id: "ivss", label: "IVSS", href: "/declaraciones/ivss" },
  { id: "faov", label: "FAOV", href: "/declaraciones/faov" },
  { id: "none", label: "Sin plantilla" },
];

const initialRules: TaxRule[] = [
  { id: 1, name: "IVA", organism: "SENIAT", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "iva", source: "", effectiveFrom: "", active: false },
  { id: 2, name: "DPP", organism: "Por definir", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "dpp", source: "", effectiveFrom: "", active: false },
  { id: 3, name: "INCES", organism: "INCES", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "inces", source: "", effectiveFrom: "", active: false },
  { id: 4, name: "IVSS", organism: "IVSS", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "ivss", source: "", effectiveFrom: "", active: false },
  { id: 5, name: "FAOV", organism: "Por definir", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "faov", source: "", effectiveFrom: "", active: false },
  { id: 6, name: "Pensiones", organism: "Por definir", frequency: "Por definir", deadlineRule: "Sin regla definida", template: "none", source: "", effectiveFrom: "", active: false },
];

const emptyRule: TaxRule = { id: 0, name: "", organism: "", frequency: "Mensual", deadlineRule: "", template: "none", source: "", effectiveFrom: "", active: false };

export function TaxRuleSettings() {
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState<TaxRule | null>(null);
  const [removing, setRemoving] = useState<TaxRule | null>(null);

  const save = () => {
    if (!draft || !draft.name || !draft.organism || !draft.deadlineRule) return;
    const isReady = Boolean(draft.source && draft.effectiveFrom);
    if (draft.id) setRules((current) => current.map((rule) => rule.id === draft.id ? { ...draft, active: isReady ? draft.active : false } : rule));
    else setRules((current) => [...current, { ...draft, id: Date.now(), active: false }]);
    setDraft(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Impuestos y obligaciones</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Define el vencimiento, vigencia y plantilla operativa de cada obligación. Una regla no puede habilitarse hasta registrar su fuente y fecha de vigencia.</p>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" onClick={() => setDraft({ ...emptyRule })} type="button"><Plus size={16} /> Crear obligación</button>
      </div>
      <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
        <div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0" size={18} /><div><p className="font-semibold">Reglas pendientes de validación</p><p className="mt-1 leading-5">Las filas iniciales solo conectan obligaciones con las plantillas ya diseñadas. Los días de vencimiento, fuentes y vigencias deben cargarse con el criterio normativo validado por la firma.</p></div></div>
      </section>
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Catálogo de reglas</h2><p className="mt-1 text-sm text-stone-500">{rules.length} obligaciones configuradas · ninguna regla fiscal se presume automáticamente</p></div>
        <div className="overflow-x-auto">
          <Table className="min-w-[980px] w-full text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="px-5 py-3">Obligación</TableHead><TableHead className="px-3 py-3">Periodicidad</TableHead><TableHead className="px-3 py-3">Regla de vencimiento</TableHead><TableHead className="px-3 py-3">Plantilla</TableHead><TableHead className="px-3 py-3">Vigencia y fuente</TableHead><TableHead className="px-3 py-3">Estado</TableHead><TableHead className="px-5 py-3" /></TableRow></TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {rules.map((rule) => {
                const template = templates.find((item) => item.id === rule.template);
                const ready = Boolean(rule.source && rule.effectiveFrom && rule.deadlineRule !== "Sin regla definida");
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="px-5 py-4"><p className="font-medium">{rule.name}</p><p className="mt-0.5 text-xs text-stone-500">{rule.organism}</p></TableCell>
                    <TableCell className="px-3 py-4">{rule.frequency}</TableCell>
                    <TableCell className="px-3 py-4"><span className="inline-flex items-start gap-1.5"><CalendarDays className="mt-0.5 shrink-0 text-stone-400" size={15} />{rule.deadlineRule}</span></TableCell>
                    <TableCell className="px-3 py-4">{template?.href ? <Link className="inline-flex items-center gap-1 font-medium text-[#14352d] hover:underline dark:text-emerald-300" href={template.href}>{template.label}<ExternalLink size={13} /></Link> : <span className="text-stone-500">{template?.label}</span>}</TableCell>
                    <TableCell className="px-3 py-4">{ready ? <><p className="font-medium">{formatDate(rule.effectiveFrom)}</p><p className="mt-0.5 max-w-48 truncate text-xs text-stone-500" title={rule.source}>{rule.source}</p></> : <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Pendiente de documentar</span>}</TableCell>
                    <TableCell className="px-3 py-4"><button className={`rounded-full px-2.5 py-1 text-xs font-medium ${rule.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`} disabled={!ready} onClick={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} title={!ready ? "Completa regla, fuente y vigencia para habilitar" : undefined} type="button">{rule.active ? "Habilitada" : ready ? "Deshabilitada" : "Borrador"}</button></TableCell>
                    <TableCell className="px-5 py-4"><div className="flex justify-end gap-1"><button aria-label={`Editar ${rule.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] dark:hover:bg-stone-800" onClick={() => setDraft({ ...rule })} type="button"><Pencil size={15} /></button><button aria-label={`Eliminar ${rule.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={() => setRemoving(rule)} type="button"><Trash2 size={15} /></button></div></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
      {draft && <RuleDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} />}
      {removing && <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4" role="dialog"><section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><h2 className="text-lg font-semibold">¿Eliminar obligación?</h2><p className="mt-2 text-sm leading-6 text-stone-500">Se eliminará <span className="font-medium text-stone-800 dark:text-stone-200">{removing.name}</span> del catálogo de la firma.</p><div className="mt-6 flex justify-end gap-2"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setRemoving(null)} type="button">Cancelar</button><button className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700" onClick={() => { setRules((current) => current.filter((rule) => rule.id !== removing.id)); setRemoving(null); }} type="button">Eliminar</button></div></section></div>}
    </div>
  );
}

function RuleDialog({ draft, onChange, onClose, onSave }: { draft: TaxRule; onChange: (rule: TaxRule) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-stone-950/35 p-4" role="dialog">
      <section className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <div className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800"><div><h2 className="text-lg font-semibold">{draft.id ? "Editar obligación" : "Crear obligación"}</h2><p className="mt-1 text-sm text-stone-500">La fuente y vigencia mantienen trazabilidad sobre la regla aplicada.</p></div><button aria-label="Cerrar" className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={onClose} type="button"><X size={17} /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="field-label">Impuesto u obligación<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Ej. Pensiones" value={draft.name} /></label>
          <label className="field-label">Organismo<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, organism: event.target.value })} placeholder="Ente responsable" value={draft.organism} /></label>
          <label className="field-label">Periodicidad<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, frequency: event.target.value })} value={draft.frequency}><option>Por definir</option><option>Mensual</option><option>Trimestral</option><option>Anual</option><option>Por evento</option><option>Configurable por empresa</option></SimpleSelect></label>
          <label className="field-label">Plantilla aplicable<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, template: event.target.value as TemplateId })} value={draft.template}>{templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</SimpleSelect></label>
          <label className="field-label sm:col-span-2">Regla de vencimiento<textarea className="field mt-1.5 min-h-20 py-2" onChange={(event) => onChange({ ...draft, deadlineRule: event.target.value })} placeholder="Ej. Día fijo, días después del cierre o calendario según terminal de RIF" value={draft.deadlineRule} /></label>
          <label className="field-label">Vigente desde<DatePicker
            className="field mt-1.5"
            onChange={(event) => onChange({ ...draft, effectiveFrom: event.target.value })}
            value={draft.effectiveFrom} /></label>
          <label className="field-label">Fuente normativa o interna<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, source: event.target.value })} placeholder="Providencia, gaceta o criterio validado" value={draft.source} /></label>
          <div className="sm:col-span-2 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><span className="inline-flex items-center gap-1.5 font-semibold"><FileCheck2 size={14} /> Control de activación</span><p className="mt-1">La regla quedará como borrador mientras falten la fuente, la vigencia o el detalle del vencimiento.</p></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" onClick={onClose} type="button">Cancelar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!draft.name || !draft.organism || !draft.deadlineRule} onClick={onSave} type="button"><Check size={16} /> Guardar regla</button></div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
