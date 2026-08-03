"use client";

import { BookOpenCheck, Check, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  source: string;
};

type Template = { id: string; version: number; name: string; description: string; sourceName: string };

const emptyAccount: Account = {
  id: "",
  version: 0,
  code: "",
  name: "",
  type: "Activo",
  nature: "Deudora",
  level: "1",
  parent: "Sin cuenta superior",
  use: "",
  acceptsMovements: true,
  status: "Activa",
  source: "Manual",
};

export function FirmChartOfAccountsTemplate() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return accounts.filter((account) => !normalized || `${account.code} ${account.name} ${account.type} ${account.use}`.toLocaleLowerCase("es").includes(normalized));
  }, [accounts, query]);

  useEffect(() => {
    let active = true;
    void fetch("/api/firm/chart-of-accounts-template")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el plan base.");
        if (!active) return;
        setTemplate(body.template);
        setAccounts(body.accounts);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "No fue posible cargar el plan base."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveAccount() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(draft.id ? `/api/firm/chart-of-accounts-template/${draft.id}` : "/api/firm/chart-of-accounts-template", {
        method: draft.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible guardar la cuenta base.");
      const account = body.account as Account;
      setAccounts((current) => draft.id ? current.map((item) => item.id === account.id ? account : item) : [...current, account].sort(compareCode));
      setDraft(null);
      setNotice("Cuenta base guardada y registrada en auditoría.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible guardar la cuenta base."); }
    finally { setSaving(false); }
  }

  async function deleteAccount() {
    if (!deleting) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/firm/chart-of-accounts-template/${deleting.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible eliminar la cuenta base.");
      setAccounts((current) => current.filter((account) => account.id !== deleting.id));
      setDeleting(null);
      setNotice("Cuenta retirada del plan base. Las empresas que ya la habían aplicado conservan su copia.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible eliminar la cuenta base."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma / Contabilidad</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Plan de cuentas base</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">Edita la plantilla de la firma que puede aplicarse a cada empresa. Los cambios no modifican planes empresariales ya aplicados.</p>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={loading || Boolean(error)} onClick={() => setDraft({ ...emptyAccount })} type="button"><Plus size={16} /> Crear cuenta base</button>
      </header>

      {(notice || error) && <p aria-live="polite" className={`mt-5 rounded-xl border p-3 text-sm font-medium ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || notice}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Summary label="Cuentas base" value={String(accounts.length)} detail={`${accounts.filter((account) => account.status === "Activa").length} activas`} />
        <Summary label="Cuentas de movimiento" value={String(accounts.filter((account) => account.acceptsMovements).length)} detail="Se copiarán con permiso de asientos" />
        <Summary label="Fuente inicial" value={template?.name ?? "—"} detail={template?.sourceName || "Plantilla administrada por la firma"} />
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="text-[#14352d] dark:text-emerald-300" size={18} /> Estructura de la plantilla</h2><p className="mt-1 text-sm text-stone-500">Cada alta, edición y eliminación queda persistida y auditada.</p></div>
          <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código o cuenta" value={query} /></div>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {loading && <p className="flex items-center justify-center gap-2 p-12 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={17} /> Preparando el plan base…</p>}
          {!loading && filtered.map((account) => (
            <div className="grid gap-3 p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 sm:grid-cols-[8rem_minmax(0,1.3fr)_minmax(0,1fr)_7rem_auto] sm:items-center" key={account.id}>
              <span className="font-mono text-sm font-semibold text-[#14352d] dark:text-emerald-300">{account.code}</span>
              <span><b className="text-sm">{account.name}</b><span className="mt-0.5 block text-xs text-stone-500">{account.parent}</span></span>
              <span className="text-sm text-stone-500">{account.type} · {account.use}</span>
              <span className={`text-xs font-medium ${account.status === "Activa" ? "text-emerald-700 dark:text-emerald-300" : "text-stone-400"}`}>{account.status}</span>
              <div className="flex justify-end gap-1"><button aria-label={`Editar ${account.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700" onClick={() => setDraft({ ...account })} type="button"><Pencil size={15} /></button><button aria-label={`Eliminar ${account.name}`} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={() => setDeleting(account)} type="button"><Trash2 size={15} /></button></div>
            </div>
          ))}
          {!loading && !filtered.length && <p className="p-10 text-center text-sm text-stone-500">No hay cuentas que coincidan con la búsqueda.</p>}
        </div>
      </section>

      {draft && <AccountDialog draft={draft} existingCodes={accounts.filter((account) => account.id !== draft.id).map((account) => account.code)} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => void saveAccount()} saving={saving} />}
      <Dialog onOpenChange={(open) => { if (!open) setDeleting(null); }} open={Boolean(deleting)}><DialogContent className="max-w-md gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>Eliminar cuenta base</DialogTitle><DialogDescription>La cuenta se retirará de futuras aplicaciones del plan base.</DialogDescription></DialogHeader><div className="p-5 text-sm text-stone-600 dark:text-stone-300"><b>{deleting?.code} · {deleting?.name}</b><p className="mt-2 leading-6">Las empresas que ya tienen esta cuenta conservarán su copia independiente.</p></div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium" type="button" />}>Cancelar</DialogClose><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-700 px-3 text-sm font-medium text-white disabled:opacity-50" disabled={saving} onClick={() => void deleteAccount()} type="button"><Trash2 size={15} /> {saving ? "Eliminando…" : "Eliminar cuenta"}</button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function AccountDialog({ draft, existingCodes, onChange, onClose, onSave, saving }: { draft: Account; existingCodes: string[]; onChange: (account: Account) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  const duplicated = existingCodes.includes(draft.code.trim());
  return <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open><DialogContent className="max-w-2xl gap-0 p-0"><DialogHeader className="border-b border-stone-100 px-5 py-4 pr-14 dark:border-stone-800"><DialogTitle>{draft.id ? "Editar cuenta base" : "Crear cuenta base"}</DialogTitle><DialogDescription>Define la clasificación, jerarquía y comportamiento que se copiará a las empresas.</DialogDescription></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Código"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, code: event.target.value })} value={draft.code} />{duplicated && <span className="mt-1 block text-xs text-rose-600">Este código ya existe.</span>}</Field><Field label="Nombre"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, name: event.target.value })} value={draft.name} /></Field><Field label="Tipo"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, type: event.target.value })} value={draft.type}>{["Activo", "Pasivo", "Patrimonio", "Ingreso", "Costo", "Gasto", "Cuenta de orden"].map((type) => <option key={type}>{type}</option>)}</SimpleSelect></Field><Field label="Naturaleza"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, nature: event.target.value })} value={draft.nature}><option>Deudora</option><option>Acreedora</option></SimpleSelect></Field><Field label="Nivel"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, level: event.target.value })} value={draft.level}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></SimpleSelect></Field><Field label="Cuenta superior"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, parent: event.target.value })} value={draft.parent} /></Field><Field label="Uso operativo"><Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, use: event.target.value })} value={draft.use} /></Field><Field label="Estado"><SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...draft, status: event.target.value as Account["status"] })} value={draft.status}><option>Activa</option><option>Inactiva</option></SimpleSelect></Field></div><label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700"><span><b className="text-sm">Permitir movimientos</b><span className="mt-1 block text-xs text-stone-500">Desactívalo para cuentas agrupadoras.</span></span><input checked={draft.acceptsMovements} className="size-5 accent-[#14352d]" onChange={(event) => onChange({ ...draft, acceptsMovements: event.target.checked })} type="checkbox" /></label></div><DialogFooter className="border-t border-stone-100 px-5 py-4 dark:border-stone-800"><DialogClose render={<button className="h-9 rounded-lg px-3 text-sm font-medium" type="button" />}>Cancelar</DialogClose><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white disabled:opacity-50" disabled={saving || !draft.code.trim() || !draft.name.trim() || duplicated} onClick={onSave} type="button"><Check size={15} /> {saving ? "Guardando…" : "Guardar cuenta"}</button></DialogFooter></DialogContent></Dialog>;
}

function compareCode(a: Account, b: Account) { return a.code.localeCompare(b.code, "es", { numeric: true }); }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="field-label">{label}{children}</label>; }
function Summary({ detail, label, value }: { detail: string; label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 truncate text-2xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-stone-500" title={detail}>{detail}</p></div>; }
