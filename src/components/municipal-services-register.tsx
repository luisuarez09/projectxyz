"use client";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { CalendarDays, CalendarPlus, CircleCheck, FileText, Paperclip, Plus, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type DeadlineRule, formatDeadlineRule } from "@/lib/deadline-rules";

type Service = { id: number; type: string; organism: string; reference: string; due: string; dueRule: string; amount: number; status: "Pendiente de pago" | "Vigente"; attachment: boolean };
const municipalDeadline: DeadlineRule = { mode: "days", dayCount: 10, dayType: "business", base: "period-start" };
const invoiceDeadline: DeadlineRule = { mode: "document-date", dayCount: 0, dayType: "calendar", base: "document-date" };
const serviceTypes = {
  "Aseo urbano": { organism: "Alcaldía · Municipio principal", deadline: municipalDeadline },
  Electricidad: { organism: "Prestador eléctrico", deadline: invoiceDeadline },
  Agua: { organism: "Prestador de agua", deadline: invoiceDeadline },
  Gas: { organism: "Prestador de gas", deadline: invoiceDeadline },
  Publicidad: { organism: "Alcaldía aplicable", deadline: municipalDeadline },
  "Solvencia municipal": { organism: "Alcaldía · Municipio principal", deadline: invoiceDeadline },
} as const;
const choices = Object.keys(serviceTypes) as Array<keyof typeof serviceTypes>;
const initial: Service[] = [
  { id: 1, type: "Aseo urbano", organism: "Alcaldía · Municipio principal", reference: "Planilla junio 2026", due: "Pendiente de cálculo", dueRule: formatDeadlineRule(municipalDeadline), amount: 580, status: "Pendiente de pago", attachment: true },
  { id: 2, type: "Electricidad", organism: "Prestador eléctrico", reference: "Factura 06-2026", due: "10 jul 2026", dueRule: formatDeadlineRule(invoiceDeadline), amount: 1320, status: "Pendiente de pago", attachment: true },
  { id: 3, type: "Solvencia municipal", organism: "Alcaldía · Municipio principal", reference: "Solvencia 2026", due: "Vigente hasta 31 dic 2026", dueRule: "Fecha indicada en el documento", amount: 0, status: "Vigente", attachment: true },
];
const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });

export function MunicipalServicesRegister() {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<keyof typeof serviceTypes>("Aseo urbano");
  const [amount, setAmount] = useState("");
  const [attached, setAttached] = useState(false);
  const pending = items.filter((item) => item.status === "Pendiente de pago");
  const isSolvency = type === "Solvencia municipal";
  const selectedType = serviceTypes[type];
  const selectedRule = formatDeadlineRule(selectedType.deadline);
  const add = () => {
    if (!isSolvency && !amount) return;
    setItems((rows) => [{ id: Date.now(), type, organism: selectedType.organism, reference: "Documento por identificar", due: "Pendiente de cálculo", dueRule: selectedRule, amount: isSolvency ? 0 : Number(amount), status: isSolvency ? "Vigente" : "Pendiente de pago", attachment: attached }, ...rows]);
    setOpen(false); setAmount(""); setAttached(false);
  };

  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm text-stone-500">Empresa activa / Servicios</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Servicios y solvencias</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Registra documentos y montos. El calendario calcula el vencimiento con la cantidad y el tipo de días configurados para el servicio.</p></div><div className="flex flex-wrap gap-2"><Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800" href="/servicios/estatus"><CalendarDays size={16} /> Estatus de servicios</Link><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" onClick={() => setOpen(true)} type="button"><Plus size={16} /> Registrar servicio</button></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Pendientes de pago" value={String(pending.length)} detail="Para solicitar transferencia" /><Metric label="Monto pendiente" value={money.format(pending.reduce((total, item) => total + item.amount, 0))} detail="Registros cargados" /><Metric label="Solvencias vigentes" value={String(items.filter((item) => item.status === "Vigente").length)} detail="Documentos vigentes en expediente" /></div>
    <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Servicios de la empresa</h2><p className="mt-1 text-sm text-stone-500">La fecha y la regla usada permanecen visibles para revisar el cálculo.</p></div><div className="overflow-x-auto"><Table className="min-w-[900px] w-full text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="px-5 py-3">Servicio / organismo</TableHead><TableHead className="px-3 py-3">Documento</TableHead><TableHead className="px-3 py-3">Fecha tope</TableHead><TableHead className="px-3 py-3 text-right">Monto</TableHead><TableHead className="px-3 py-3">Soporte</TableHead><TableHead className="px-5 py-3">Estatus</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{items.map((item) => <TableRow key={item.id}><TableCell className="px-5 py-4"><p className="font-medium">{item.type}</p><p className="mt-0.5 text-xs text-stone-500">{item.organism}</p></TableCell><TableCell className="px-3 py-4">{item.reference}</TableCell><TableCell className="px-3 py-4"><p className="font-medium">{item.due}</p><p className="mt-1 max-w-56 text-xs text-stone-500">{item.dueRule}</p></TableCell><TableCell className="px-3 py-4 text-right font-medium">{item.amount ? money.format(item.amount) : "—"}</TableCell><TableCell className="px-3 py-4">{item.attachment ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CircleCheck size={14} /> Adjunto</span> : <span className="text-xs text-amber-700">Pendiente</span>}</TableCell><TableCell className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Pendiente de pago" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{item.status}</span></TableCell></TableRow>)}</TableBody></Table></div></section>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d]"><FileText size={19} /></div><div><h2 className="font-semibold">Registrar servicio o solvencia</h2><p className="mt-1 text-sm text-stone-500">El organismo y el cálculo del vencimiento vienen del catálogo de la firma.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Tipo<SimpleSelect className="field mt-1.5" onChange={(event) => setType(event.target.value as keyof typeof serviceTypes)} value={type}>{choices.map((item) => <option key={item}>{item}</option>)}</SimpleSelect></label><div className="text-sm font-medium">Organismo aplicado<div className="mt-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-normal text-stone-600">{selectedType.organism}</div></div><div className="text-sm font-medium sm:col-span-2">Cálculo de la fecha tope<div className="mt-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-normal text-stone-600">{selectedRule}</div></div>{!isSolvency && <label className="text-sm font-medium">Monto determinado<Input className="field mt-1.5" min="0" onChange={(event) => setAmount(event.target.value)} step="0.01" type="number" value={amount} /></label>}</div><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stone-300 p-3"><UploadCloud size={18} className="text-stone-500" /><span className="flex-1"><span className="block text-sm font-medium">Documento, factura o solvencia</span><span className="block text-xs text-stone-500">{attached ? "Archivo preparado para adjuntar" : "Selecciona el documento"}</span></span><Paperclip size={16} className="text-stone-400" /><AttachmentInput className="sr-only" onChange={(event) => setAttached(Boolean(event.target.files?.[0]))} /></label><div className="mt-6 flex justify-end gap-2"><button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!isSolvency && !amount} onClick={add} type="button"><CalendarPlus size={16} /> Registrar</button></div></section></div>}
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>; }
