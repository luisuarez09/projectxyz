"use client";

import { BookOpenCheck, Check, ChevronRight, Download, Eye, FileUp, Layers3, LoaderCircle, Pencil, Plus, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AccountingAssignments } from "@/components/accounting-assignments";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
type Account = {
  id: string;
  version: number;
  code: string;
  name: string;
  type: string;
  nature: string;
  level: string;
  parent: string;
  use: string;
  acceptsMovements: boolean;
  status: "Activa" | "Inactiva";
  source: "Plan base" | "Manual";
};

type Movement = { date: string; document: string; description: string; debit: string; credit: string; balance: string };

const movementsByCode: Record<string, Movement[]> = {
  "1.1.01": [
    { date: "28 jul 2026", document: "RC-00231", description: "Cobro factura V-1048", debit: "Bs. 18.420,00", credit: "—", balance: "Bs. 52.840,00" },
    { date: "27 jul 2026", document: "TR-00814", description: "Pago a proveedor", debit: "—", credit: "Bs. 7.500,00", balance: "Bs. 34.420,00" },
    { date: "25 jul 2026", document: "AP-00092", description: "Aporte de caja", debit: "Bs. 4.000,00", credit: "—", balance: "Bs. 41.920,00" },
  ],
  "4.1.01": [
    { date: "28 jul 2026", document: "V-1048", description: "Venta de mercancía", debit: "—", credit: "Bs. 18.420,00", balance: "Bs. 92.350,00" },
  ],
};

const emptyAccount: Account = { id: "", version: 0, code: "", name: "", type: "Activo", nature: "Deudora", level: "1", parent: "Sin cuenta superior", use: "", acceptsMovements: true, status: "Activa", source: "Manual" };

export function CompanyChartOfAccounts() {
  const [activeArea, setActiveArea] = useState<"accounts" | "assignments">("accounts");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companyName, setCompanyName] = useState("Empresa activa");
  const [templateName, setTemplateName] = useState("Comercial genérico");
  const [templateAccountCount, setTemplateAccountCount] = useState(0);
  const [canManage, setCanManage] = useState(false);
  const [canApplyTemplate, setCanApplyTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Account | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);
  const [detailTab, setDetailTab] = useState<"details" | "movements">("details");
  const [baseOpen, setBaseOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => accounts.filter((account) => `${account.code} ${account.name} ${account.type} ${account.use}`.toLowerCase().includes(query.toLowerCase())), [accounts, query]);

  useEffect(() => {
    let active = true;
    void fetch("/api/chart-of-accounts")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el plan de cuentas.");
        if (!active) return;
        setAccounts(body.accounts);
        setCompanyName(body.company.legalName);
        setCanManage(body.canManage);
        setCanApplyTemplate(body.canApplyTemplate);
        setTemplateName(body.template.name);
        setTemplateAccountCount(body.template.accountCount);
      })
      .catch((reason) => { if (active) setNotice(reason instanceof Error ? reason.message : "No fue posible cargar el plan de cuentas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveAccount = async () => {
    if (!draft?.code.trim() || !draft.name.trim()) return;
    const saved = { ...draft, code: draft.code.trim(), name: draft.name.trim(), parent: draft.parent.trim() || "Sin cuenta superior", use: draft.use.trim() };
    setSaving(true);
    try {
      const response = await fetch(saved.id ? `/api/chart-of-accounts/${saved.id}` : "/api/chart-of-accounts", {
        method: saved.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(saved),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible guardar la cuenta.");
      const account = body.account as Account;
      setAccounts((current) => saved.id ? current.map((item) => item.id === account.id ? account : item) : [...current, account].sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true })));
      setSelected((current) => current?.id === account.id ? account : current);
      setDraft(null);
      setNotice("Cuenta guardada en la base de datos.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "No fue posible guardar la cuenta."); }
    finally { setSaving(false); }
  };

  const applyGenericPlan = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/chart-of-accounts/apply-template", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible aplicar el plan base.");
      setAccounts(body.accounts);
      setBaseOpen(false);
      setNotice(body.addedAccounts ? `${body.addedAccounts} cuentas del plan base agregadas sin duplicar códigos existentes.` : "El plan base ya está aplicado; no se agregaron cuentas duplicadas.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "No fue posible aplicar el plan base."); }
    finally { setSaving(false); }
  };

  const exportPlan = () => {
    const header = "codigo,nombre,tipo,naturaleza,nivel,cuenta_superior,uso,acepta_movimientos,estado";
    const rows = accounts.map((account) => [account.code, account.name, account.type, account.nature, account.level, account.parent, account.use, account.acceptsMovements ? "si" : "no", account.status].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${[header, ...rows].join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "plan-de-cuentas.csv"; link.click(); URL.revokeObjectURL(url);
    setNotice("Plan de cuentas exportado en CSV.");
  };

  return <div className="mx-auto w-full min-w-0 py-7 pb-16"><header className="flex min-w-0 flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800"><div className="min-w-0"><p className="text-sm text-stone-500">Empresa activa / Configuración / Contabilidad</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Plan de cuentas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Administra la estructura contable y define las cuentas predeterminadas para los impuestos y servicios activos de {companyName}.</p></div>{activeArea === "accounts" && <div className="flex min-w-0 flex-wrap gap-2"><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800" disabled={!canApplyTemplate || saving} onClick={() => setBaseOpen(true)} type="button"><Layers3 size={16} /> Usar plan base</button><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium opacity-50 dark:border-stone-700 dark:bg-stone-900" disabled title="Importación pendiente" type="button"><Upload size={16} /> Importar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800" onClick={exportPlan} type="button"><Download size={16} /> Exportar</button><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!canManage} onClick={() => setDraft({ ...emptyAccount })} type="button"><Plus size={16} /> Crear cuenta</button></div>}</header><nav aria-label="Secciones del plan de cuentas" className="flex gap-7 border-b border-stone-200 dark:border-stone-800"><AreaTab active={activeArea === "accounts"} label="Cuentas" onClick={() => setActiveArea("accounts")} /><AreaTab active={activeArea === "assignments"} label="Asignaciones contables" onClick={() => setActiveArea("assignments")} /></nav>

    {activeArea === "accounts" ? <><div className="mt-6 grid gap-4 sm:grid-cols-3"><Summary label="Cuentas" value={String(accounts.length)} detail={`${accounts.filter((account) => account.status === "Activa").length} activas`} /><Summary label="Cuentas de movimiento" value={String(accounts.filter((account) => account.acceptsMovements).length)} detail="Reciben asientos contables" /><Summary label="Última actualización" value="Hoy" detail="Cambios en esta vista" /></div>

    {notice && <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><Check size={16} /> {notice}</div>}

    <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="text-[#14352d] dark:text-emerald-300" size={18} /> Estructura contable</h2><p className="mt-1 text-sm text-stone-500">Abre una cuenta para consultar sus datos y movimientos. La edición se realiza mediante una acción separada.</p></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código o cuenta" value={query} /></div></div><div className="divide-y divide-stone-100 dark:divide-stone-800">{loading && <p className="flex items-center justify-center gap-2 p-10 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={17} /> Cargando plan de cuentas…</p>}{!loading && filtered.map((account) => <div className="grid gap-3 p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 sm:grid-cols-[7rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_auto] sm:items-center" key={account.id}><button className="contents text-left" onClick={() => { setSelected(account); setDetailTab("details"); }} type="button"><span className="font-mono text-sm font-semibold text-[#14352d] dark:text-emerald-300">{account.code}</span><span><b className="text-sm">{account.name}</b><span className="mt-0.5 block text-xs text-stone-500">{account.parent}</span></span><span className="text-sm text-stone-500">{account.type} · {account.use}</span><span className={`text-xs font-medium ${account.status === "Activa" ? "text-emerald-700 dark:text-emerald-300" : "text-stone-400"}`}>{account.status}</span></button><div className="flex items-center justify-end gap-1"><button aria-label={`Ver ${account.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700" onClick={() => { setSelected(account); setDetailTab("details"); }} type="button"><Eye size={15} /></button><button aria-label={`Editar ${account.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] disabled:opacity-40 dark:hover:bg-stone-700" disabled={!canManage} onClick={() => setDraft({ ...account })} type="button"><Pencil size={15} /></button><ChevronRight className="text-stone-300" size={15} /></div></div>)}{!loading && filtered.length === 0 && <p className="p-10 text-center text-sm text-stone-500">No hay cuentas que coincidan con la búsqueda.</p>}</div></section></> : <AccountingAssignments accounts={accounts} onCreateAccount={() => { if (canManage) setDraft({ ...emptyAccount }); }} />}

    {draft && <AccountDialog draft={draft} existingCodes={accounts.filter((account) => account.id !== draft.id).map((account) => account.code)} onChange={setDraft} onClose={() => setDraft(null)} onSave={saveAccount} />}
    {selected && <AccountDetails account={selected} activeTab={detailTab} movements={movementsByCode[selected.code] ?? []} onClose={() => setSelected(null)} onEdit={() => { setDraft({ ...selected }); setSelected(null); }} onTabChange={setDetailTab} />}
    <Dialog onOpenChange={setBaseOpen} open={baseOpen}><DialogContent className="max-w-lg gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Usar un plan de cuentas base</DialogTitle><DialogDescription>Agrega una estructura comercial genérica sin reemplazar ni duplicar los códigos que ya existen.</DialogDescription></DialogHeader><div className="min-h-0 overflow-y-auto p-5"><div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/25"><p className="font-semibold">{templateName}</p><p className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-300">Activo, pasivo, patrimonio, ingresos, costos, gastos y cuentas de orden; incluye la estructura detallada hasta el nivel 5.</p><p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">{templateAccountCount} cuentas base · no elimina la estructura actual</p></div><p className="mt-4 text-xs leading-5 text-stone-500">Es una plantilla base de la firma. Antes de usarla operativamente debe revisarse según las políticas contables y el tratamiento fiscal aplicable a la empresa.</p></div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" type="button" />}>Cancelar</DialogClose><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={saving} onClick={() => void applyGenericPlan()} type="button"><Layers3 size={15} /> {saving ? "Aplicando…" : "Aplicar plan base"}</button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function AccountDialog({ draft, existingCodes, onChange, onClose, onSave }: { draft: Account; existingCodes: string[]; onChange: (account: Account) => void; onClose: () => void; onSave: () => void }) {
  const duplicated = existingCodes.includes(draft.code.trim());
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open><DialogContent className="max-w-2xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>{draft.id ? "Editar cuenta" : "Crear cuenta"}</DialogTitle><DialogDescription>Define la clasificación, jerarquía y comportamiento contable de la cuenta.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Código"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, code: event.target.value })} placeholder="Ej. 1.1.03" value={draft.code} />{duplicated && <span className="mt-1 block text-xs text-rose-600">Este código ya existe.</span>}</Field><Field label="Nombre"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Nombre de la cuenta" value={draft.name} /></Field><Field label="Tipo"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, type: event.target.value })} value={draft.type}>{["Activo", "Pasivo", "Patrimonio", "Ingreso", "Costo", "Gasto", "Cuenta de orden", "Orden"].map((type) => <option key={type}>{type}</option>)}</SimpleSelect></Field><Field label="Naturaleza"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, nature: event.target.value })} value={draft.nature}><option>Deudora</option><option>Acreedora</option></SimpleSelect></Field><Field label="Nivel"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, level: event.target.value })} value={draft.level}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></SimpleSelect></Field><Field label="Cuenta superior"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, parent: event.target.value })} value={draft.parent} /></Field><Field label="Uso operativo"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, use: event.target.value })} placeholder="Ej. Clientes o ventas" value={draft.use} /></Field><Field label="Estado"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, status: event.target.value as Account["status"] })} value={draft.status}><option>Activa</option><option>Inactiva</option></SimpleSelect></Field></div><label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700"><span><b className="text-sm">Permitir movimientos</b><span className="mt-1 block text-xs leading-5 text-stone-500">Desactívalo para cuentas agrupadoras que solo organizan cuentas auxiliares.</span></span><input checked={draft.acceptsMovements} className="size-5 accent-[#14352d]" onChange={(event) => onChange({ ...draft, acceptsMovements: event.target.checked })} type="checkbox" /></label></div><DialogFooter className="border-t border-stone-100 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-900"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" type="button" />}>Cancelar</DialogClose><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={!draft.code.trim() || !draft.name.trim() || duplicated} onClick={onSave} type="button"><Check size={15} /> Guardar cuenta</button></DialogFooter></DialogContent></Dialog>;
}

function AccountDetails({ account, activeTab, movements, onClose, onEdit, onTabChange }: { account: Account; activeTab: "details" | "movements"; movements: Movement[]; onClose: () => void; onEdit: () => void; onTabChange: (tab: "details" | "movements") => void }) {
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open><DialogContent className="max-w-3xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><div className="flex flex-wrap items-center gap-2"><DialogTitle>{account.code} · {account.name}</DialogTitle><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{account.status}</span></div><DialogDescription>{account.type} · {account.nature} · Nivel {account.level}</DialogDescription></DialogHeader><nav className="flex shrink-0 gap-6 border-b border-stone-100 px-5 dark:border-stone-800"><DetailTab active={activeTab === "details"} label="Detalles" onClick={() => onTabChange("details")} /><DetailTab active={activeTab === "movements"} label={`Movimientos (${movements.length})`} onClick={() => onTabChange("movements")} /></nav><div className="min-h-0 flex-1 overflow-y-auto p-5">{activeTab === "details" ? <dl className="grid gap-4 sm:grid-cols-2"><Detail label="Código" value={account.code} /><Detail label="Nombre" value={account.name} /><Detail label="Tipo" value={account.type} /><Detail label="Naturaleza" value={account.nature} /><Detail label="Cuenta superior" value={account.parent} /><Detail label="Uso operativo" value={account.use || "Sin uso asignado"} /><Detail label="Acepta movimientos" value={account.acceptsMovements ? "Sí" : "No · cuenta agrupadora"} /><Detail label="Estado" value={account.status} /></dl> : <div>{movements.length ? <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700"><table className="min-w-[680px] w-full text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800"><tr><th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Documento</th><th className="px-3 py-2.5">Descripción</th><th className="px-3 py-2.5 text-right">Debe</th><th className="px-3 py-2.5 text-right">Haber</th><th className="px-3 py-2.5 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-stone-100 dark:divide-stone-800">{movements.map((movement) => <tr key={`${movement.date}-${movement.document}`}><td className="whitespace-nowrap px-3 py-3">{movement.date}</td><td className="px-3 py-3 font-medium">{movement.document}</td><td className="px-3 py-3">{movement.description}</td><td className="whitespace-nowrap px-3 py-3 text-right">{movement.debit}</td><td className="whitespace-nowrap px-3 py-3 text-right">{movement.credit}</td><td className="whitespace-nowrap px-3 py-3 text-right font-medium">{movement.balance}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700"><FileUp className="mx-auto text-stone-400" size={24} /><p className="mt-3 font-medium">Sin movimientos registrados</p><p className="mt-1 text-sm text-stone-500">Los asientos vinculados a esta cuenta aparecerán aquí.</p></div>}</div>}</div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800" type="button" />}>Cerrar</DialogClose><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" onClick={onEdit} type="button"><Pencil size={15} /> Editar cuenta</button></DialogFooter></DialogContent></Dialog>;
}

function DetailTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button className={`border-b-2 py-3 text-sm font-medium ${active ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-300" : "border-transparent text-stone-500"}`} onClick={onClick} type="button">{label}</button>; }
function AreaTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button aria-current={active ? "page" : undefined} className={`border-b-2 px-1 py-3 text-sm font-medium ${active ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-300" : "border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"}`} onClick={onClick} type="button">{label}</button>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-700"><dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-2 text-sm font-medium">{value}</dd></div>; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="field-label">{label}{children}</label>; }
function Summary({ detail, label, value }: { detail: string; label: string; value: string }) { return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>; }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
