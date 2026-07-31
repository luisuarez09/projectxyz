"use client";

import { CalendarDays, Check, ExternalLink, FileCheck2, ListChecks, Pencil, Percent, Plus, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DeadlineRuleFields } from "@/components/deadline-rule-fields";
import { SpecialTaxpayerCalendar } from "@/components/special-taxpayer-calendar";
import { VatRateSettings } from "@/components/vat-rate-settings";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DeadlineRule, emptyDeadlineRule, formatDeadlineRule, isDeadlineConfigured } from "@/lib/deadline-rules";
import { speCalendarGroups } from "@/lib/spe-calendar-2026";

type TemplateId = "iva" | "dpp" | "inces" | "ivss" | "faov" | "none";
type SettingsTab = "rules" | "vat-rates" | "spe-calendar";
type TaxRule = {
  id: number;
  name: string;
  organism: string;
  frequency: string;
  speFrequency: string;
  speCalendarGroup: string;
  deadline: DeadlineRule;
  template: TemplateId;
  source: string;
  appliesFrom: string;
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

const frequencyOptions = ["Por definir", "Quincenal", "Mensual", "Trimestral", "Anual", "Por evento", "Configurable por empresa"];

const businessDays = (dayCount: number): DeadlineRule => ({ mode: "days", dayCount, dayType: "business", base: "next-period-start" });
const calendarDays = (dayCount: number): DeadlineRule => ({ mode: "days", dayCount, dayType: "calendar", base: "next-period-start" });

const initialRules: TaxRule[] = [
  { id: 1, name: "IVA", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", speCalendarGroup: "a-fortnights", deadline: businessDays(15), template: "iva", source: "", appliesFrom: "", active: false },
  { id: 2, name: "Retenciones de IVA", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", speCalendarGroup: "a-fortnights", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 3, name: "IGTF", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", speCalendarGroup: "a-fortnights", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 4, name: "Anticipos de ISLR", organism: "SENIAT", frequency: "Mensual", speFrequency: "Quincenal", speCalendarGroup: "a-fortnights", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 5, name: "Retenciones de ISLR", organism: "SENIAT", frequency: "Mensual", speFrequency: "Mensual", speCalendarGroup: "c-islr-withholdings", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 6, name: "Autoliquidación anual de ISLR", organism: "SENIAT", frequency: "Anual", speFrequency: "Anual", speCalendarGroup: "f-annual-islr", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 7, name: "Impuesto a los Grandes Patrimonios", organism: "SENIAT", frequency: "Anual", speFrequency: "Anual", speCalendarGroup: "h-large-assets", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false },
  { id: 8, name: "Impuesto municipal", organism: "Alcaldía aplicable", frequency: "Mensual", speFrequency: "No aplica", speCalendarGroup: "", deadline: businessDays(10), template: "none", source: "", appliesFrom: "", active: false },
  { id: 9, name: "IVSS", organism: "IVSS", frequency: "Mensual", speFrequency: "No aplica", speCalendarGroup: "", deadline: calendarDays(5), template: "ivss", source: "", appliesFrom: "", active: false },
  { id: 10, name: "DPP", organism: "SENIAT", frequency: "Mensual", speFrequency: "No aplica", speCalendarGroup: "", deadline: { ...emptyDeadlineRule }, template: "dpp", source: "", appliesFrom: "", active: false },
  { id: 11, name: "INCES", organism: "INCES", frequency: "Trimestral", speFrequency: "No aplica", speCalendarGroup: "", deadline: { ...emptyDeadlineRule }, template: "inces", source: "", appliesFrom: "", active: false },
  { id: 12, name: "FAOV", organism: "BANAVIH", frequency: "Mensual", speFrequency: "No aplica", speCalendarGroup: "", deadline: { ...emptyDeadlineRule }, template: "faov", source: "", appliesFrom: "", active: false },
];

const emptyRule: TaxRule = { id: 0, name: "", organism: "", frequency: "Mensual", speFrequency: "No aplica", speCalendarGroup: "", deadline: { ...emptyDeadlineRule }, template: "none", source: "", appliesFrom: "", active: false };

export function TaxRuleSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("rules");
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState<TaxRule | null>(null);
  const [removing, setRemoving] = useState<TaxRule | null>(null);

  useEffect(() => {
    if (window.location.hash === "#calendario-spe") setActiveTab("spe-calendar");
  }, []);

  const save = () => {
    if (!draft || !draft.name || !draft.organism || !isDeadlineConfigured(draft.deadline)) return;
    const isReady = Boolean(draft.source && draft.appliesFrom);
    const normalized = draft.speFrequency === "No aplica" ? { ...draft, speCalendarGroup: "" } : draft;
    if (draft.id) setRules((current) => current.map((rule) => rule.id === draft.id ? { ...normalized, active: isReady ? draft.active : false } : rule));
    else setRules((current) => [...current, { ...normalized, id: Date.now(), active: false }]);
    setDraft(null);
  };

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-stone-500">Configuración de la firma</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Impuestos y obligaciones</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Cada impuesto conserva su regla ordinaria. Cuando una empresa es SPE, se aplica además la matriz especial asociada al tributo, período y terminal de RIF.</p></div>{activeTab === "rules" && <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white hover:bg-[#0e2821]" onClick={() => setDraft({ ...emptyRule, deadline: { ...emptyDeadlineRule } })} type="button"><Plus size={16} /> Crear obligación</button>}</header>

    <nav aria-label="Secciones de impuestos" className="mt-6 flex gap-7 border-b border-stone-200 dark:border-stone-800" id="calendario-spe">
      <TabButton active={activeTab === "rules"} icon={ListChecks} label="Reglas de obligaciones" onClick={() => setActiveTab("rules")} />
      <TabButton active={activeTab === "vat-rates"} icon={Percent} label="Alícuotas IVA" onClick={() => setActiveTab("vat-rates")} />
      <TabButton active={activeTab === "spe-calendar"} icon={CalendarDays} label="Calendario SPE" onClick={() => setActiveTab("spe-calendar")} />
    </nav>

    {activeTab === "rules" ? <>
      <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100"><div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0" size={18} /><div><p className="font-semibold">Dos reglas, una sola obligación</p><p className="mt-1 leading-5">El vencimiento ordinario se usa para contribuyentes no especiales. La regla SPE no lo reemplaza en el catálogo: se activa únicamente por la condición tributaria de la empresa y consulta la matriz indicada.</p></div></div></section>
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Catálogo de reglas</h2><p className="mt-1 text-sm text-stone-500">{rules.length} obligaciones · vencimiento ordinario y tratamiento SPE visibles por separado</p></div>
        <div className="hidden md:block"><Table className="w-full table-fixed text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="w-[24%] px-5 py-3">Obligación</TableHead><TableHead className="w-[28%] px-3 py-3">Regla ordinaria</TableHead><TableHead className="w-[32%] px-3 py-3">Tratamiento SPE</TableHead><TableHead className="w-[16%] px-5 py-3 text-right">Gestión</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{rules.map((rule) => <RuleRow key={rule.id} rule={rule} onEdit={() => setDraft({ ...rule, deadline: { ...rule.deadline } })} onRemove={() => setRemoving(rule)} onToggle={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} />)}</TableBody></Table></div>
        <div className="divide-y divide-stone-100 md:hidden dark:divide-stone-800">{rules.map((rule) => <RuleCard key={rule.id} rule={rule} onEdit={() => setDraft({ ...rule, deadline: { ...rule.deadline } })} onRemove={() => setRemoving(rule)} onToggle={() => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))} />)}</div>
      </section>
    </> : activeTab === "vat-rates" ? <div className="mt-5"><VatRateSettings /></div> : <div className="mt-5"><SpecialTaxpayerCalendar /></div>}

    {draft && <RuleDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} />}
    {removing && <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4" role="dialog"><section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><h2 className="text-lg font-semibold">¿Eliminar obligación?</h2><p className="mt-2 text-sm leading-6 text-stone-500">Se eliminará <span className="font-medium text-stone-800 dark:text-stone-200">{removing.name}</span> del catálogo de la firma.</p><div className="mt-6 flex justify-end gap-2"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setRemoving(null)} type="button">Cancelar</button><button className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700" onClick={() => { setRules((current) => current.filter((rule) => rule.id !== removing.id)); setRemoving(null); }} type="button">Eliminar</button></div></section></div>}
  </div>;
}

function RuleRow({ rule, onEdit, onRemove, onToggle }: { rule: TaxRule; onEdit: () => void; onRemove: () => void; onToggle: () => void }) {
  const template = templates.find((item) => item.id === rule.template);
  const ready = Boolean(rule.source && rule.appliesFrom && isDeadlineConfigured(rule.deadline));
  const calendar = speCalendarGroups.find((group) => group.id === rule.speCalendarGroup);
  return <TableRow className="align-top"><TableCell className="break-words px-5 py-4"><p className="font-medium">{rule.name}</p><p className="mt-0.5 text-xs text-stone-500">{rule.organism}</p><div className="mt-3 text-xs">{template?.href ? <Link className="inline-flex items-center gap-1 font-medium text-[#14352d] hover:underline dark:text-emerald-300" href={template.href}>Plantilla {template.label}<ExternalLink size={12} /></Link> : <span className="text-stone-400">{template?.label}</span>}</div></TableCell><TableCell className="break-words px-3 py-4"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{rule.frequency}</p><span className="mt-2 inline-flex items-start gap-1.5 leading-5"><CalendarDays className="mt-0.5 shrink-0 text-stone-400" size={15} />{formatDeadlineRule(rule.deadline)}</span></TableCell><TableCell className="break-words px-3 py-4">{rule.speFrequency === "No aplica" ? <span className="text-stone-400">No aplica</span> : <div><p className="font-medium text-violet-700 dark:text-violet-300">{rule.speFrequency} · por terminal RIF</p><p className="mt-1 text-xs leading-5 text-stone-500">{calendar?.label ?? "Matriz por asignar"}</p></div>}</TableCell><TableCell className="px-5 py-4"><div className="flex flex-col items-end gap-3"><RuleStatus active={rule.active} onToggle={onToggle} ready={ready} /><RuleActions name={rule.name} onEdit={onEdit} onRemove={onRemove} /></div></TableCell></TableRow>;
}

function RuleCard({ rule, onEdit, onRemove, onToggle }: { rule: TaxRule; onEdit: () => void; onRemove: () => void; onToggle: () => void }) {
  const template = templates.find((item) => item.id === rule.template);
  const ready = Boolean(rule.source && rule.appliesFrom && isDeadlineConfigured(rule.deadline));
  const calendar = speCalendarGroups.find((group) => group.id === rule.speCalendarGroup);
  return <article className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium">{rule.name}</h3><p className="mt-0.5 text-xs text-stone-500">{rule.organism}</p></div><RuleActions name={rule.name} onEdit={onEdit} onRemove={onRemove} /></div><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Regla ordinaria · {rule.frequency}</dt><dd className="mt-1.5 flex items-start gap-1.5 leading-5"><CalendarDays className="mt-0.5 shrink-0 text-stone-400" size={15} />{formatDeadlineRule(rule.deadline)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-stone-400">Tratamiento SPE</dt><dd className="mt-1.5">{rule.speFrequency === "No aplica" ? <span className="text-stone-400">No aplica</span> : <><p className="font-medium text-violet-700 dark:text-violet-300">{rule.speFrequency} · por terminal RIF</p><p className="mt-1 text-xs leading-5 text-stone-500">{calendar?.label ?? "Matriz por asignar"}</p></>}</dd></div></dl><div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 dark:border-stone-800"><div className="text-xs">{template?.href ? <Link className="inline-flex items-center gap-1 font-medium text-[#14352d] hover:underline dark:text-emerald-300" href={template.href}>Plantilla {template.label}<ExternalLink size={12} /></Link> : <span className="text-stone-400">{template?.label}</span>}</div><RuleStatus active={rule.active} onToggle={onToggle} ready={ready} /></div></article>;
}

function RuleStatus({ active, onToggle, ready }: { active: boolean; onToggle: () => void; ready: boolean }) {
  return <button className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`} disabled={!ready} onClick={onToggle} title={!ready ? "Completa el vencimiento ordinario y su trazabilidad" : undefined} type="button">{active ? "Habilitada" : ready ? "Deshabilitada" : "Borrador"}</button>;
}

function RuleActions({ name, onEdit, onRemove }: { name: string; onEdit: () => void; onRemove: () => void }) {
  return <div className="flex shrink-0 justify-end gap-1"><button aria-label={`Editar ${name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] dark:hover:bg-stone-800" onClick={onEdit} type="button"><Pencil size={15} /></button><button aria-label={`Eliminar ${name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={onRemove} type="button"><Trash2 size={15} /></button></div>;
}

function RuleDialog({ draft, onChange, onClose, onSave }: { draft: TaxRule; onChange: (rule: TaxRule) => void; onClose: () => void; onSave: () => void }) {
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open><DialogContent className="max-w-2xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>{draft.id ? "Editar obligación" : "Crear obligación"}</DialogTitle><DialogDescription>Configura primero el tratamiento ordinario y luego, si corresponde, la matriz SPE.</DialogDescription></DialogHeader>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="field-label">Impuesto u obligación<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Ej. Pensiones" value={draft.name} /></label><label className="field-label">Organismo<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, organism: event.target.value })} placeholder="Ente responsable" value={draft.organism} /></label>
      <div className="sm:col-span-2 rounded-xl border border-stone-200 p-4 dark:border-stone-700"><p className="text-sm font-semibold">Regla ordinaria</p><p className="mt-1 text-xs text-stone-500">Se aplica a las empresas que no estén registradas como sujetos pasivos especiales.</p><label className="field-label mt-4 block">Periodicidad ordinaria<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, frequency: event.target.value })} value={draft.frequency}>{frequencyOptions.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</SimpleSelect></label><div className="mt-4"><DeadlineRuleFields onChange={(deadline) => onChange({ ...draft, deadline })} value={draft.deadline} /></div></div>
      <div className="sm:col-span-2 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-900 dark:bg-violet-950/20"><p className="text-sm font-semibold text-violet-950 dark:text-violet-100">Regla adicional para SPE</p><p className="mt-1 text-xs leading-5 text-stone-500">No modifica el vencimiento ordinario. Se usa únicamente cuando la empresa tiene régimen SPE.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Periodicidad SPE<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, speFrequency: event.target.value })} value={draft.speFrequency}><option>No aplica</option><option>Quincenal</option><option>Mensual</option><option>Anual</option><option>Según cierre</option></SimpleSelect></label><label className="field-label">Matriz de fechas<SimpleSelect className="field mt-1.5" disabled={draft.speFrequency === "No aplica"} onChange={(event) => onChange({ ...draft, speCalendarGroup: event.target.value })} value={draft.speCalendarGroup}><option value="">Selecciona la matriz</option>{speCalendarGroups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</SimpleSelect></label></div></div>
      <label className="field-label sm:col-span-2">Plantilla aplicable<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, template: event.target.value as TemplateId })} value={draft.template}>{templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</SimpleSelect></label>
      <details className="sm:col-span-2 rounded-xl border border-stone-200 p-4 dark:border-stone-700"><summary className="cursor-pointer text-sm font-semibold">Trazabilidad de la regla ordinaria</summary><p className="mt-2 text-xs leading-5 text-stone-500">La pestaña Calendario SPE conserva su propia fuente anual.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Aplicar a períodos desde<DatePicker className="field mt-1.5" onChange={(event) => onChange({ ...draft, appliesFrom: event.target.value })} value={draft.appliesFrom} /></label><label className="field-label">Documento que respalda la regla ordinaria<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, source: event.target.value })} placeholder="Providencia, gaceta o criterio validado" value={draft.source} /></label></div></details>
      <div className="sm:col-span-2 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><span className="inline-flex items-center gap-1.5 font-semibold"><FileCheck2 size={14} /> Control de activación</span><p className="mt-1">La obligación queda como borrador mientras falten el vencimiento ordinario o su trazabilidad. Si aplica SPE, también debe tener una matriz asignada.</p></div>
    </div></div><DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" type="button" />}>Cancelar</DialogClose><button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!draft.name || !draft.organism || !isDeadlineConfigured(draft.deadline) || draft.speFrequency !== "No aplica" && !draft.speCalendarGroup} onClick={onSave} type="button"><Check size={16} /> Guardar regla</button></DialogFooter></DialogContent></Dialog>;
}

function TabButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof CalendarDays; label: string; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${active ? "border-[#14352d] font-medium text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"}`} onClick={onClick} type="button"><Icon size={16} /> {label}</button>;
}
