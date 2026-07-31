"use client";

import { AlertTriangle, Check, CircleCheck, Landmark, Plus, Save, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import { SimpleSelect } from "@/components/ui/simple-select";

type AccountOption = { code: string; name: string; status: string; acceptsMovements: boolean };
type AssignmentRole = { id: string; label: string; help: string };
type AssignmentItem = { id: string; name: string; organism: string; roles: AssignmentRole[] };

const taxAssignments: AssignmentItem[] = [
  { id: "iva", name: "IVA", organism: "SENIAT", roles: [
    { id: "iva-debit", label: "IVA débito fiscal", help: "Impuesto generado en las ventas." },
    { id: "iva-credit", label: "IVA crédito fiscal", help: "Impuesto soportado en las compras." },
    { id: "iva-payable", label: "IVA por pagar", help: "Saldo determinado en la declaración." },
    { id: "iva-bank", label: "Banco para el pago", help: "Cuenta sugerida al registrar el pago." },
  ] },
  { id: "municipal", name: "Impuesto municipal", organism: "Alcaldía aplicable", roles: [
    { id: "municipal-expense", label: "Gasto de impuesto municipal", help: "Reconocimiento del gasto del período." },
    { id: "municipal-payable", label: "Impuesto municipal por pagar", help: "Obligación pendiente ante la alcaldía." },
    { id: "municipal-bank", label: "Banco para el pago", help: "Cuenta sugerida al registrar el pago." },
  ] },
  { id: "inces", name: "INCES", organism: "INCES", roles: [
    { id: "inces-expense", label: "Gasto patronal INCES", help: "Aporte causado por la empresa." },
    { id: "inces-payable", label: "INCES por pagar", help: "Obligación pendiente de pago." },
    { id: "inces-bank", label: "Banco para el pago", help: "Cuenta sugerida al registrar el pago." },
  ] },
];

const serviceAssignments: AssignmentItem[] = [
  { id: "electricity", name: "Electricidad", organism: "Prestador eléctrico", roles: [
    { id: "electricity-expense", label: "Gasto de electricidad", help: "Cuenta de gasto sugerida al registrar la factura." },
    { id: "electricity-payable", label: "Servicio por pagar", help: "Pasivo mientras la factura permanezca pendiente." },
  ] },
  { id: "water", name: "Agua", organism: "Prestador de agua", roles: [
    { id: "water-expense", label: "Gasto de agua", help: "Cuenta de gasto sugerida al registrar la factura." },
    { id: "water-payable", label: "Servicio por pagar", help: "Pasivo mientras la factura permanezca pendiente." },
  ] },
];

const initialAssignments: Record<string, string> = {
  "iva-bank": "1.1.01",
  "municipal-bank": "1.1.01",
  "inces-bank": "1.1.01",
  "electricity-payable": "2.1.01",
  "water-payable": "2.1.01",
};

export function AccountingAssignments({ accounts, onCreateAccount }: { accounts: AccountOption[]; onCreateAccount: () => void }) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [saved, setSaved] = useState(false);
  const availableAccounts = accounts.filter((account) => account.status === "Activa" && account.acceptsMovements);
  const allItems = [...taxAssignments, ...serviceAssignments];
  const completed = useMemo(() => allItems.filter((item) => item.roles.every((role) => assignments[role.id])).length, [assignments]);
  const assignedRoles = useMemo(() => allItems.flatMap((item) => item.roles).filter((role) => assignments[role.id]).length, [assignments]);
  const totalRoles = allItems.flatMap((item) => item.roles).length;
  const update = (roleId: string, accountCode: string) => { setAssignments((current) => ({ ...current, [roleId]: accountCode })); setSaved(false); };

  return <div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Summary label="Elementos activos" value={String(allItems.length)} detail={`${taxAssignments.length} impuestos · ${serviceAssignments.length} servicios`} /><Summary label="Configuración completa" value={`${completed} de ${allItems.length}`} detail="Todos sus roles tienen cuenta" /><Summary label="Roles asignados" value={`${assignedRoles} de ${totalRoles}`} detail="Cuentas predeterminadas" /></div><section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100"><div className="flex gap-3"><Landmark className="mt-0.5 shrink-0" size={18} /><div><p className="font-semibold">Asignaciones predeterminadas de la empresa</p><p className="mt-1 leading-5">Compras, ventas, declaraciones y pagos usarán estas cuentas como sugerencia. El usuario podrá cambiarlas o distribuir un importe entre varias cuentas durante la operación.</p></div></div></section><AssignmentGroup accounts={availableAccounts} assignments={assignments} icon={Landmark} items={taxAssignments} onCreateAccount={onCreateAccount} onUpdate={update} title="Impuestos activos" /><AssignmentGroup accounts={availableAccounts} assignments={assignments} icon={WalletCards} items={serviceAssignments} onCreateAccount={onCreateAccount} onUpdate={update} title="Servicios activos" /><div className="mt-6 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between"><div>{saved ? <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><CircleCheck size={16} /> Asignaciones guardadas en esta vista.</p> : <p className="text-sm text-stone-500">Los cambios pendientes no afectan los períodos ya contabilizados.</p>}<p className="mt-1 text-xs text-stone-400">La persistencia definitiva deberá conservar la versión utilizada por cada asiento.</p></div><button className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" onClick={() => setSaved(true)} type="button"><Save size={15} /> Guardar asignaciones</button></div></div>;
}

function AssignmentGroup({ accounts, assignments, icon: Icon, items, onCreateAccount, onUpdate, title }: { accounts: AccountOption[]; assignments: Record<string, string>; icon: typeof Landmark; items: AssignmentItem[]; onCreateAccount: () => void; onUpdate: (roleId: string, accountCode: string) => void; title: string }) {
  return <section className="mt-6"><div className="mb-3 flex items-center gap-2"><Icon className="text-[#14352d] dark:text-emerald-300" size={18} /><h2 className="font-semibold">{title}</h2></div><div className="space-y-4">{items.map((item) => { const complete = item.roles.every((role) => assignments[role.id]); return <article className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900" key={item.id}><header className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{item.name}</h3><p className="mt-1 text-xs text-stone-500">{item.organism} · {item.roles.length} cuentas requeridas</p></div><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${complete ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{complete ? <Check size={13} /> : <AlertTriangle size={13} />}{complete ? "Completa" : "Faltan cuentas"}</span></header><div className="grid gap-4 p-5 md:grid-cols-2">{item.roles.map((role) => <label className="text-sm font-medium" key={role.id}>{role.label}<SimpleSelect className="field mt-1.5" onChange={(event) => onUpdate(role.id, event.target.value)} value={assignments[role.id] ?? ""}><option value="">Seleccionar cuenta</option>{accounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}</SimpleSelect><span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">{role.help}</span></label>)}</div>{!complete && <footer className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50/60 px-5 py-3 dark:border-stone-800 dark:bg-stone-800/30 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-stone-500">¿La cuenta necesaria todavía no existe en el plan?</p><button className="inline-flex items-center gap-1 text-xs font-medium text-[#14352d] dark:text-emerald-300" onClick={onCreateAccount} type="button"><Plus size={14} /> Crear cuenta contable</button></footer>}</article>; })}</div></section>;
}

function Summary({ detail, label, value }: { detail: string; label: string; value: string }) { return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>; }
