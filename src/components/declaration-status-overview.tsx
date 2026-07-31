"use client";;
import { CheckCircle2, CircleAlert, Clock3, MinusCircle, XCircle } from "lucide-react";
import Link from "next/link";

import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Status = "pagada" | "declarada" | "pendiente" | "futura" | "no-aplica";
type Obligation = { name: string; cadence: string; href: string; statuses: Status[] };

const obligations: Obligation[] = [
  { name: "IVA", cadence: "Mensual", href: "/declaraciones/iva", statuses: ["pagada", "pagada", "pagada", "pagada", "pagada", "pendiente", "futura", "futura", "futura", "futura", "futura", "futura"] },
  { name: "IVSS · Seguro Social", cadence: "Mensual", href: "/declaraciones/ivss", statuses: ["pagada", "pagada", "pagada", "pagada", "pagada", "pendiente", "futura", "futura", "futura", "futura", "futura", "futura"] },
  { name: "FAOV", cadence: "Mensual", href: "/declaraciones/faov", statuses: ["pagada", "pagada", "pagada", "pagada", "pagada", "pendiente", "futura", "futura", "futura", "futura", "futura", "futura"] },
  { name: "INCES · Aporte patronal", cadence: "Trimestral", href: "/declaraciones/inces", statuses: ["no-aplica", "no-aplica", "pagada", "no-aplica", "no-aplica", "declarada", "no-aplica", "no-aplica", "futura", "no-aplica", "no-aplica", "futura"] },
  { name: "Retención ISLR", cadence: "Mensual", href: "/declaraciones", statuses: ["pagada", "pagada", "pagada", "pagada", "pagada", "declarada", "futura", "futura", "futura", "futura", "futura", "futura"] },
  { name: "Actividades económicas", cadence: "Mensual · Casa matriz", href: "/declaraciones/municipales", statuses: ["pagada", "pagada", "pagada", "pagada", "pagada", "pendiente", "futura", "futura", "futura", "futura", "futura", "futura"] },
];

const statusInfo: Record<Status, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  pagada: { label: "Pagada", className: "text-emerald-500", Icon: CheckCircle2 },
  declarada: { label: "Declarada", className: "text-amber-500", Icon: Clock3 },
  pendiente: { label: "Pendiente", className: "text-rose-500", Icon: XCircle },
  futura: { label: "Pendiente de período", className: "text-slate-400", Icon: MinusCircle },
  "no-aplica": { label: "No corresponde", className: "text-stone-300 dark:text-stone-600", Icon: MinusCircle },
};

export function DeclarationStatusOverview() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm text-stone-500"><Link className="hover:text-[#14352d] dark:hover:text-emerald-300" href="/declaraciones">Declaraciones</Link><span>/</span><span>Estatus</span></div><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Estatus de declaraciones</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Panorama anual de las obligaciones de Nueva Confitería del Sur, C.A. por período de imposición.</p></div><label className="text-sm font-medium">Año<SimpleSelect className="field mt-1.5 w-32" defaultValue="2026"><option>2026</option></SimpleSelect></label></div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3"><Summary label="Pagadas" value="21" detail="Períodos con evidencia de pago" tone="emerald" /><Summary label="Por completar" value="4" detail="Junio y 2do trimestre requieren gestión" tone="rose" /><Summary label="Declaradas" value="2" detail="Presentadas, pendientes de pago o cierre" tone="amber" /></div>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Control anual de cumplimiento</h2><p className="mt-1 text-sm text-stone-500">Cada marca representa el estado del expediente de ese período.</p></div><div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">{(["pendiente", "declarada", "pagada", "futura"] as Status[]).map((status) => <Legend key={status} status={status} />)}</div></div><div className="overflow-x-auto"><Table className="min-w-[900px] w-full text-left text-sm"><TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="min-w-60 px-5 py-3">Obligación</TableHead>{months.map((month) => <TableHead className="w-14 px-2 py-3 text-center" key={month}>{month}</TableHead>)}</TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">{obligations.map((obligation) => <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-800/50" key={obligation.name}><TableCell className="px-5 py-4"><Link className="font-medium hover:text-[#14352d] dark:hover:text-emerald-300" href={obligation.href}>{obligation.name}</Link><p className="mt-0.5 text-xs text-stone-500">{obligation.cadence}</p></TableCell>{obligation.statuses.map((status, index) => <TableCell className="px-2 py-4 text-center" key={`${obligation.name}-${months[index]}`}><StatusMark status={status} /></TableCell>)}</TableRow>)}</TableBody></Table></div><div className="border-t border-stone-100 bg-stone-50/60 px-5 py-3 text-xs leading-5 text-stone-500 dark:border-stone-800 dark:bg-stone-800/40">Vista de control demostrativa: los estados se alimentarán de los expedientes y evidencias registrados en cada declaración.</div></section>
    </div>
  );
}

function StatusMark({ status }: { status: Status }) { const { label, className, Icon } = statusInfo[status]; return <span className={`inline-flex ${className}`} title={label}><Icon aria-label={label} size={18} /></span>; }

function Legend({ status }: { status: Status }) { const { label, className, Icon } = statusInfo[status]; return <span className={`inline-flex items-center gap-1 ${className}`}><Icon size={15} /> {label}</span>; }

function Summary({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "rose" | "amber" }) { const colors = { emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300" }; const icons = { emerald: CheckCircle2, rose: CircleAlert, amber: Clock3 }; const Icon = icons[tone]; return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-start justify-between"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><div className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><Icon size={18} /></div></div></div>; }
