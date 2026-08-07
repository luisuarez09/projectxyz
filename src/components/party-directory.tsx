"use client";

import { SeniatRifLookup } from "@/components/seniat-rif-lookup";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type PartyKind = "customer" | "supplier";

type Account = { id: string; code: string; name: string; type: string; label: string };
type Party = {
  id: string;
  legalName: string;
  rif: string;
  fiscalAddress: string;
  email: string;
  phone: string;
  primaryAccountId: string | null;
  primaryAccount: string;
  counterpartAccountId: string | null;
  counterpartAccount: string;
  invoiceCount: number;
  version: number;
};
type Draft = Pick<Party, "legalName" | "rif" | "fiscalAddress" | "email" | "phone" | "primaryAccountId" | "counterpartAccountId">;

const emptyDraft: Draft = {
  legalName: "",
  rif: "",
  fiscalAddress: "",
  email: "",
  phone: "",
  primaryAccountId: null,
  counterpartAccountId: null,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la operación.";
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No fue posible completar la operación.");
  return payload as T;
}

function preferredAccount(accounts: Account[], kind: PartyKind, side: "primary" | "counterpart") {
  const match = accounts.find((account) => {
    const value = `${account.code} ${account.name}`.toLowerCase();
    if (kind === "customer" && side === "primary") return account.type === "ASSET" && value.includes("cobrar");
    if (kind === "customer") return account.type === "INCOME";
    if (side === "primary") return account.type === "EXPENSE" || account.type === "COST";
    return account.type === "LIABILITY" && value.includes("pagar");
  });
  return match?.id ?? null;
}

export function PartyDirectory({ kind }: { kind: PartyKind }) {
  const router = useRouter();
  const isCustomer = kind === "customer";
  const title = isCustomer ? "Clientes comerciales" : "Proveedores";
  const noun = isCustomer ? "cliente" : "proveedor";
  const primaryLabel = isCustomer ? "Cuenta por cobrar" : "Cuenta de gasto";
  const counterpartLabel = isCustomer ? "Cuenta de ingresos" : "Cuenta por pagar";
  const profileBase = isCustomer ? "/operaciones/clientes" : "/operaciones/proveedores";
  const [parties, setParties] = useState<Party[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<25 | 50 | "all">(25);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importedFileName, setImportedFileName] = useState("");
  const [editing, setEditing] = useState<Party | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readResponse<{ parties: Party[]; accounts: Account[]; canManage: boolean }>(await fetch(`/api/counterparties?kind=${kind}`, { cache: "no-store" }));
      setParties(data.parties);
      setAccounts(data.accounts);
      setCanManage(data.canManage);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // La recarga depende exclusivamente del tipo de directorio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const filtered = useMemo(
    () => parties.filter((party) => `${party.legalName} ${party.rif}`.toLowerCase().includes(query.toLowerCase())),
    [parties, query],
  );
  const totalPages = itemsPerPage === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const rows = itemsPerPage === "all" ? filtered : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const firstRow = filtered.length === 0 ? 0 : itemsPerPage === "all" ? 1 : (currentPage - 1) * itemsPerPage + 1;
  const lastRow = itemsPerPage === "all" ? filtered.length : Math.min(currentPage * itemsPerPage, filtered.length);

  const openCreate = () => {
    setEditing(null);
    setDraft({
      ...emptyDraft,
      primaryAccountId: preferredAccount(accounts, kind, "primary"),
      counterpartAccountId: preferredAccount(accounts, kind, "counterpart"),
    });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (party: Party) => {
    setEditing(party);
    setDraft({
      legalName: party.legalName,
      rif: party.rif,
      fiscalAddress: party.fiscalAddress,
      email: party.email,
      phone: party.phone,
      primaryAccountId: party.primaryAccountId,
      counterpartAccountId: party.counterpartAccountId,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!draft.legalName.trim() || !draft.rif.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/counterparties/${editing.id}` : "/api/counterparties", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...draft, ...(editing ? { version: editing.version } : {}) }),
      });
      const data = await readResponse<{ party: Party }>(response);
      setParties((current) => editing
        ? current.map((party) => party.id === data.party.id ? data.party : party)
        : [...current, data.party].sort((a, b) => a.legalName.localeCompare(b.legalName, "es")));
      setNotice(`${editing ? "Cambios guardados" : `${isCustomer ? "Cliente" : "Proveedor"} registrado`} en la empresa activa.`);
      setFormOpen(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (party: Party) => {
    if (!window.confirm(`¿Archivar ${party.legalName}? Sus facturas se conservarán.`)) return;
    setError("");
    try {
      await readResponse(await fetch(`/api/counterparties/${party.id}?kind=${kind}`, { method: "DELETE" }));
      setParties((current) => current.filter((item) => item.id !== party.id));
      setNotice(`${isCustomer ? "Cliente" : "Proveedor"} archivado. Los movimientos históricos se conservaron.`);
    } catch (removeError) {
      setError(errorMessage(removeError));
    }
  };

  const changeSize = (value: string) => {
    setItemsPerPage(value === "all" ? "all" : Number(value) as 25 | 50);
    setPage(1);
  };

  const download = (format: "csv" | "excel") => {
    const header = ["Nombre legal", "RIF", "Dirección fiscal", primaryLabel, counterpartLabel, "Facturas"];
    const data = filtered.map((party) => [party.legalName, party.rif, party.fiscalAddress, party.primaryAccount, party.counterpartAccount, String(party.invoiceCount)]);
    if (format === "csv") {
      saveFile(new Blob(["\ufeff", [header, ...data].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), `${noun}s.csv`);
    } else {
      saveFile(new Blob([`<html><meta charset="UTF-8"><table>${[header, ...data].map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table></html>`], { type: "application/vnd.ms-excel" }), `${noun}s.xls`);
    }
    setActionsOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Operaciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Registra los datos fiscales y la configuración contable que se aplicará como referencia al cargar operaciones.</p>
        </div>
        <Button className="h-9 bg-[#14352d] hover:bg-[#0e2821]" disabled={!canManage || loading} onClick={openCreate}><Plus /> Nuevo {noun}</Button>
      </div>

      {notice && <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 shrink-0" size={17} /> {notice}</p>}
      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

      <section className="mt-7 overflow-visible rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} /><Input className="field pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre legal o RIF..." value={query} /></div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <label className="flex items-center gap-2 text-xs text-stone-500">Mostrar <SimpleSelect aria-label="Cantidad de registros por página" className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200" onChange={(event) => changeSize(event.target.value)} value={itemsPerPage}><option value="25">25</option><option value="50">50</option><option value="all">Todos</option></SimpleSelect></label>
            <div className="relative">
              <Button aria-expanded={actionsOpen} aria-label="Opciones de tabla" onClick={() => setActionsOpen((open) => !open)} size="icon-sm" type="button" variant="outline"><MoreHorizontal size={18} /></Button>
              {actionsOpen && <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                <button className="menu-action" onClick={() => { setActionsOpen(false); setImportOpen(true); }} type="button"><FileUp size={16} /> Importar archivo</button>
                <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                <button className="menu-action" onClick={() => download("excel")} type="button"><FileSpreadsheet size={16} /> Exportar Excel</button>
                <button className="menu-action" onClick={() => download("csv")} type="button"><FileText size={16} /> Exportar CSV</button>
                <button className="menu-action" onClick={() => { setActionsOpen(false); window.print(); }} type="button"><FileText size={16} /> Exportar PDF</button>
                <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                <button className="menu-action" onClick={() => { setActionsOpen(false); window.print(); }} type="button"><Printer size={16} /> Imprimir</button>
              </div>}
            </div>
          </div>
        </div>
        {importedFileName && <p className="flex items-center gap-1 px-4 pt-3 text-xs text-amber-700 dark:text-amber-300"><CheckCircle2 size={14} /> Archivo seleccionado: {importedFileName}. La validación e importación todavía están pendientes.</p>}
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[980px] text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50"><TableRow><TableHead className="px-5 py-3">Nombre legal</TableHead><TableHead className="px-5 py-3">RIF</TableHead><TableHead className="px-5 py-3">Cuenta principal</TableHead><TableHead className="px-5 py-3">Contrapartida</TableHead><TableHead className="px-5 py-3 text-center">Facturas</TableHead><TableHead className="px-5 py-3 text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {loading && <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={6}><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Cargando registros...</span></TableCell></TableRow>}
              {!loading && rows.map((party) => <TableRow className="cursor-pointer hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={party.id} onClick={() => router.push(`${profileBase}/${party.id}`)}>
                <TableCell className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Building2 size={17} /></span><div><p className="font-medium">{party.legalName}</p><p className="mt-0.5 max-w-xs truncate text-xs text-stone-500">{party.fiscalAddress || "Sin dirección fiscal"}</p></div></div></TableCell>
                <TableCell className="px-5 py-4 font-medium">{party.rif}</TableCell>
                <TableCell className="px-5 py-4 text-stone-600 dark:text-stone-300">{party.primaryAccount}</TableCell>
                <TableCell className="px-5 py-4 text-stone-600 dark:text-stone-300">{party.counterpartAccount}</TableCell>
                <TableCell className="px-5 py-4 text-center tabular-nums">{party.invoiceCount}</TableCell>
                <TableCell className="px-5 py-4"><div className="flex justify-end gap-1"><Button aria-label={`Editar ${party.legalName}`} disabled={!canManage} onClick={(event) => { event.stopPropagation(); openEdit(party); }} size="icon-sm" type="button" variant="ghost"><Edit3 size={15} /></Button><Button aria-label={`Archivar ${party.legalName}`} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={!canManage} onClick={(event) => { event.stopPropagation(); void remove(party); }} size="icon-sm" type="button" variant="ghost"><Trash2 size={15} /></Button></div></TableCell>
              </TableRow>)}
              {!loading && rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell className="p-4" colSpan={6}>
                <Empty className="min-h-72 bg-stone-50/60 dark:bg-stone-950/30">
                  <EmptyHeader>
                    <EmptyMedia className="bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950/50 dark:text-emerald-300" variant="icon">
                      {parties.length === 0 ? <Building2 /> : <Search />}
                    </EmptyMedia>
                    <EmptyTitle>{parties.length === 0 ? `Aún no hay ${isCustomer ? "clientes" : "proveedores"}` : "No hay coincidencias"}</EmptyTitle>
                    <EmptyDescription>
                      {parties.length === 0
                        ? `Registra el primer ${noun} de la empresa activa para comenzar a asociar sus facturas y movimientos.`
                        : `No encontramos ${isCustomer ? "clientes" : "proveedores"} que coincidan con “${query}”.`}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {parties.length === 0
                      ? <Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!canManage} onClick={openCreate}><Plus /> Nuevo {noun}</Button>
                      : <Button onClick={() => { setQuery(""); setPage(1); }} variant="outline">Limpiar búsqueda</Button>}
                  </EmptyContent>
                </Empty>
              </TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"><p className="text-stone-500">Mostrando {firstRow}–{lastRow} de {filtered.length} registros</p><div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" type="button" variant="outline"><ChevronLeft /> Anterior</Button><span className="min-w-20 text-center text-xs text-stone-500">Página {currentPage} de {totalPages}</span><Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} size="sm" type="button" variant="outline">Siguiente <ChevronRight /></Button></div></div>
      </section>

      {importOpen && <ImportDialog counterpartLabel={counterpartLabel} onClose={() => setImportOpen(false)} onUpload={(file) => { setImportedFileName(file.name); setImportOpen(false); }} primaryLabel={primaryLabel} title={title} />}
      {formOpen && <PartyFormDialog accounts={accounts} counterpartLabel={counterpartLabel} draft={draft} editing={editing} error={error} noun={noun} onChange={setDraft} onClose={() => setFormOpen(false)} onSave={() => void save()} primaryLabel={primaryLabel} saving={saving} />}
    </div>
  );
}

function ImportDialog({ title, primaryLabel, counterpartLabel, onClose, onUpload }: { title: string; primaryLabel: string; counterpartLabel: string; onClose: () => void; onUpload: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const select = (candidate?: File) => { if (candidate && /\.(csv|xlsx|xls)$/i.test(candidate.name)) setFile(candidate); };
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4" role="dialog"><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-stone-900"><div className="flex justify-between border-b border-stone-100 p-5 dark:border-stone-800"><div><h2 className="text-lg font-semibold">Importar {title.toLowerCase()}</h2><p className="mt-1 text-sm text-stone-500">CSV UTF-8 separado por comas o Excel (.xlsx/.xls).</p></div><Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button></div><div className="space-y-5 p-5"><p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600 dark:bg-stone-800">Columnas esperadas: Nombre legal, RIF, Dirección fiscal, {primaryLabel} y {counterpartLabel}. La importación transaccional se implementará después de la validación del archivo.</p><AttachmentInput accept=".csv,.xlsx,.xls" className="hidden" onChange={(event) => select(event.target.files?.[0])} ref={ref} /><button className="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-6 text-center hover:border-[#14352d] hover:bg-[#f4faf6]" onClick={() => ref.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0]); }} type="button"><UploadCloud className="text-[#14352d]" size={29} /><p className="mt-3 text-sm font-medium">Arrastra el archivo aquí o selecciónalo</p>{file && <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> {file.name}</p>}</button></div><div className="flex justify-end gap-2 border-t border-stone-100 p-5"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!file} onClick={() => file && onUpload(file)}>Seleccionar archivo</Button></div></div></div>;
}

function PartyFormDialog({ draft, editing, noun, primaryLabel, counterpartLabel, accounts, error, saving, onChange, onClose, onSave }: { draft: Draft; editing: Party | null; noun: string; primaryLabel: string; counterpartLabel: string; accounts: Account[]; error: string; saving: boolean; onChange: (draft: Draft) => void; onClose: () => void; onSave: () => void }) {
  const field = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...draft, [key]: event.target.value });
  return <Dialog onOpenChange={(open) => { if (!open && !saving) onClose(); }} open>
    <DialogContent className="max-w-2xl" showCloseButton={!saving}>
      <DialogHeader className="border-b border-stone-100 p-5 pr-14 dark:border-stone-800">
        <DialogTitle>{editing ? "Editar" : "Nuevo"} {noun}</DialogTitle>
        <DialogDescription>Datos fiscales y configuración contable de la empresa activa.</DialogDescription>
      </DialogHeader>
      <div className="grid overflow-y-auto p-5 sm:grid-cols-2 gap-4">
    {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200 sm:col-span-2">{error}</p>}
    <label className="text-sm font-medium sm:col-span-2">Nombre legal *<Input className="field mt-1.5" onChange={field("legalName")} value={draft.legalName} /></label>
    <div className="text-sm font-medium">RIF *<Input className="field mt-1.5" onChange={(event) => onChange({ ...draft, rif: event.target.value.toUpperCase() })} value={draft.rif} /><SeniatRifLookup rif={draft.rif} onResult={({ legalName }) => onChange({ ...draft, legalName })} /></div>
    <label className="text-sm font-medium">Dirección fiscal<textarea className="field mt-1.5 h-22 py-2" onChange={field("fiscalAddress")} value={draft.fiscalAddress} /></label>
    <label className="text-sm font-medium">Correo<Input className="field mt-1.5" onChange={field("email")} type="email" value={draft.email} /></label>
    <label className="text-sm font-medium">Teléfono<Input className="field mt-1.5" onChange={field("phone")} value={draft.phone} /></label>
    <AccountSelect accounts={accounts} label={primaryLabel} onChange={(value) => onChange({ ...draft, primaryAccountId: value })} value={draft.primaryAccountId} />
    <AccountSelect accounts={accounts} label={counterpartLabel} onChange={(value) => onChange({ ...draft, counterpartAccountId: value })} value={draft.counterpartAccountId} />
      </div>
      <DialogFooter className="border-t border-stone-100 p-5 dark:border-stone-800">
        <Button disabled={saving} onClick={onClose} variant="outline">Cancelar</Button>
        <Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!draft.legalName.trim() || !draft.rif.trim() || saving} onClick={onSave}>{saving && <Loader2 className="animate-spin" />} Guardar {noun}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function AccountSelect({ label, value, accounts, onChange }: { label: string; value: string | null; accounts: Account[]; onChange: (value: string | null) => void }) {
  return <label className="text-sm font-medium">{label}<SimpleSelect className="field mt-1.5" onChange={(event) => onChange(event.target.value || null)} value={value ?? ""}><option value="">Sin cuenta asignada</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</SimpleSelect></label>;
}

function saveFile(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
