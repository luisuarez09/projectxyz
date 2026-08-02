"use client";

import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, ChevronRight, Copy, Mail, MoreHorizontal, Pencil, Plus, Power, Search, ShieldCheck, Trash2, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

type Role = { id: string; name: string; slug: string; description: string | null; isSystem: boolean };
type Company = { id: string; legalName: string };
type Account = {
  kind: "MEMBER" | "INVITATION";
  id: string;
  version: number;
  name: string;
  email: string;
  position: string;
  profession: string;
  active: boolean;
  role: Pick<Role, "id" | "name" | "slug"> | null;
  firmWide: boolean;
  companies: Company[];
  lastAccessAt: string | null;
  mfaEnabled: boolean;
  expired?: boolean;
};
type Draft = { name: string; email: string; position: string; profession: string; roleId: string; companyIds: string[]; version?: number };
type SortKey = "name" | "position" | "role" | "status";

const emptyDraft: Draft = { name: "", email: "", position: "", profession: "", roleId: "", companyIds: [] };

function accountStatus(account: Account) {
  if (account.kind === "INVITATION") return account.expired ? "Invitación vencida" : "Invitación pendiente";
  return account.active ? "Activa" : "Desactivada";
}

export function TeamAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos los estados");
  const [roleFilter, setRoleFilter] = useState("Todos los roles");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | "all">(25);
  const [form, setForm] = useState<{ draft: Draft; account: Account | null } | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el equipo.");
      setAccounts(body.accounts);
      setRoles(body.roles);
      setCompanies(body.companies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el equipo.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => accounts
    .filter((account) => `${account.name} ${account.email} ${account.position} ${account.profession} ${account.companies.map(({ legalName }) => legalName).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .filter((account) => statusFilter === "Todos los estados" || accountStatus(account) === statusFilter)
    .filter((account) => roleFilter === "Todos los roles" || account.role?.name === roleFilter)
    .sort((a, b) => {
      const values = {
        name: [a.name, b.name],
        position: [a.position, b.position],
        role: [a.role?.name ?? "", b.role?.name ?? ""],
        status: [accountStatus(a), accountStatus(b)],
      }[sortKey];
      return values[0].localeCompare(values[1], "es") * (sortDirection === "asc" ? 1 : -1);
    }), [accounts, query, statusFilter, roleFilter, sortKey, sortDirection]);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = pageSize === "all" ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = filtered.length === 0 ? 0 : pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1;
  const lastRow = pageSize === "all" ? filtered.length : Math.min(currentPage * pageSize, filtered.length);

  function sort(key: SortKey) { if (key === sortKey) setSortDirection((value) => value === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDirection("asc"); } }
  function showNotice(value: string) { setNotice(value); setError(""); window.setTimeout(() => setNotice(""), 4200); }

  async function save(draft: Draft) {
    const editing = form?.account?.kind === "MEMBER" ? form.account : null;
    const response = await fetch(editing ? `/api/team/members/${editing.id}` : "/api/team", {
      method: editing ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No fue posible guardar la cuenta.");
    setForm(null);
    if (!editing && body.delivery === "MANUAL_LINK") {
      setInvitationUrl(body.invitationUrl);
      showNotice("Invitación creada. Como el correo está desactivado, comparte el enlace manual.");
    } else showNotice(editing ? "Cuenta y accesos actualizados." : "Invitación enviada por correo.");
    await load();
  }

  async function toggle(account: Account) {
    const response = await fetch(`/api/team/members/${account.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !account.active }) });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "No fue posible cambiar el acceso.");
    showNotice(account.active ? "Acceso desactivado y sesiones revocadas." : "Acceso reactivado.");
    await load();
  }

  async function remove() {
    if (!deleting || confirmation !== "ELIMINAR") return;
    const endpoint = deleting.kind === "MEMBER" ? `/api/team/members/${deleting.id}` : `/api/team/invitations/${deleting.id}`;
    const response = await fetch(endpoint, { method: "DELETE", headers: { "content-type": "application/json" }, body: deleting.kind === "MEMBER" ? JSON.stringify({ confirmation }) : undefined });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "No fue posible retirar el acceso."); return; }
    setDeleting(null); setConfirmation("");
    showNotice(deleting.kind === "MEMBER" ? "Acceso retirado; el historial se conservó." : "Invitación revocada.");
    await load();
  }

  const run = async (operation: () => Promise<void>) => { try { setError(""); await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible completar la operación."); } };
  const activeCount = accounts.filter((account) => account.kind === "MEMBER" && account.active).length;
  const pendingCount = accounts.filter((account) => account.kind === "INVITATION" && !account.expired).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      {notice && <div className="fixed right-4 top-22 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl dark:border-emerald-900 dark:bg-stone-900 dark:text-stone-200">{notice}</div>}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-stone-500">Equipo / Accesos</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cuentas del equipo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Identidades, roles y empresas autorizadas cargadas desde PostgreSQL.</p></div><Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={loading || roles.length === 0} onClick={() => setForm({ draft: { ...emptyDraft, roleId: roles.find(({ slug }) => slug === "colaborador")?.id ?? roles[0]?.id ?? "" }, account: null })}><Plus /> Nueva cuenta</Button></div>
      <nav className="mt-7 flex gap-6 border-b border-stone-200 text-sm dark:border-stone-800" aria-label="Secciones de equipo"><Link className="px-1 pb-3 text-stone-500 hover:text-stone-900" href="/equipo">Supervisión</Link><Link className="border-b-2 border-[#14352d] px-1 pb-3 font-medium text-[#14352d]" href="/equipo/cuentas">Cuentas y accesos</Link></nav>
      {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {invitationUrl && <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><p className="font-semibold">Enlace manual de invitación</p><p className="mt-1 text-xs leading-5 text-sky-800">Compártelo por un canal privado. Dejará de funcionar al aceptarse o vencer.</p><div className="mt-3 flex gap-2"><Input className="bg-white" readOnly value={invitationUrl} /><Button onClick={() => { void navigator.clipboard.writeText(invitationUrl); showNotice("Enlace copiado."); }} variant="outline"><Copy /> Copiar</Button><Button onClick={() => setInvitationUrl("")} variant="ghost"><X /></Button></div></div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><Summary icon={UserCheck} label="Cuentas activas" value={String(activeCount)} detail="Con acceso vigente" /><Summary icon={Mail} label="Invitaciones pendientes" value={String(pendingCount)} detail="Esperando activación" /><Summary icon={Building2} label="Empresas disponibles" value={String(companies.length)} detail="Registradas en la firma" /></div>
      <Card className="mt-6 border-0 shadow-sm"><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} /><Input className="field pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, correo, cargo, profesión o empresa…" value={query} /></div><SimpleSelect className="field w-auto min-w-48" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option>Todos los estados</option><option>Activa</option><option>Invitación pendiente</option><option>Invitación vencida</option><option>Desactivada</option></SimpleSelect><SimpleSelect className="field w-auto min-w-40" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}><option>Todos los roles</option>{roles.map((role) => <option key={role.id}>{role.name}</option>)}</SimpleSelect></div></CardContent></Card>
      <Card className="mt-4 overflow-visible border-0 shadow-sm"><div className="overflow-x-auto"><Table className="w-full min-w-[1080px] text-left text-sm"><TableHeader className="bg-stone-50 text-xs text-stone-500"><TableRow><SortHead active={sortKey === "name"} direction={sortDirection} label="Integrante" onClick={() => sort("name")} /><SortHead active={sortKey === "position"} direction={sortDirection} label="Cargo y profesión" onClick={() => sort("position")} /><SortHead active={sortKey === "role"} direction={sortDirection} label="Rol" onClick={() => sort("role")} /><TableHead>Empresas</TableHead><SortHead active={sortKey === "status"} direction={sortDirection} label="Estado" onClick={() => sort("status")} /><TableHead>Último acceso / MFA</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{rows.map((account) => <TableRow key={`${account.kind}-${account.id}`}><TableCell><div className="flex items-center gap-3"><Avatar className="size-9"><AvatarFallback>{initials(account.name)}</AvatarFallback></Avatar><div><p className="font-semibold">{account.name}</p><p className="text-xs text-stone-500">{account.email}</p></div></div></TableCell><TableCell><p className="font-medium">{account.position}</p><p className="text-xs text-stone-500">{account.profession}</p></TableCell><TableCell><span className="inline-flex items-center gap-1.5"><ShieldCheck className="text-stone-400" size={15} />{account.role?.name ?? "Sin rol"}</span></TableCell><TableCell>{account.firmWide ? <span className="text-xs font-medium">Toda la firma</span> : <span>{account.companies.length} {account.companies.length === 1 ? "empresa" : "empresas"}</span>}</TableCell><TableCell><StatusBadge status={accountStatus(account)} /></TableCell><TableCell><p className="text-xs text-stone-500">{account.lastAccessAt ? new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(account.lastAccessAt)) : "Sin acceso"}</p><p className={`mt-1 text-[11px] ${account.mfaEnabled ? "text-emerald-700" : "text-amber-700"}`}>{account.kind === "MEMBER" ? account.mfaEnabled ? "MFA activo" : "MFA pendiente" : "Cuenta pendiente"}</p></TableCell><TableCell className="text-right"><AccountActions account={account} onDelete={() => { setDeleting(account); setConfirmation(""); }} onEdit={() => setForm({ account, draft: { name: account.name, email: account.email, position: account.position, profession: account.profession, roleId: account.role?.id ?? roles[0]?.id ?? "", companyIds: account.companies.map(({ id }) => id), version: account.version } })} onToggle={() => void run(() => toggle(account))} /></TableCell></TableRow>)}{!loading && rows.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={7}>No hay cuentas que coincidan con los filtros.</TableCell></TableRow>}</TableBody></Table></div><div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3 text-stone-500"><span>Mostrando {firstRow}–{lastRow} de {filtered.length}</span><SimpleSelect className="h-8 w-auto" onChange={(event) => { setPageSize(event.target.value === "all" ? "all" : Number(event.target.value) as 25 | 50); setPage(1); }} value={pageSize}><option value="25">25</option><option value="50">50</option><option value="all">Todos</option></SimpleSelect></div><div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} variant="outline"><ChevronLeft /> Anterior</Button><span className="text-xs">Página {currentPage} de {totalPages}</span><Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} variant="outline">Siguiente <ChevronRight /></Button></div></div></Card>
      <div className="mt-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><ShieldCheck className="mt-0.5 shrink-0" size={18} /><p className="leading-6"><strong>Acceso mínimo necesario.</strong> Los colaboradores y supervisores requieren al menos una empresa. Administrador es el único rol predeterminado con alcance completo.</p></div>
      {form && <AccountForm account={form.account} companies={companies} draft={form.draft} onClose={() => setForm(null)} onSave={(draft) => run(() => save(draft))} roles={roles} />}
      {deleting && <DeleteAccount account={deleting} confirmation={confirmation} onChange={setConfirmation} onClose={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </div>
  );
}

function AccountActions({ account, onEdit, onToggle, onDelete }: { account: Account; onEdit: () => void; onToggle: () => void; onDelete: () => void }) { const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>(); const run = (fn: () => void) => { setIsOpen(false); fn(); }; return <div className="relative inline-block" ref={ref}><button aria-label={`Acciones de ${account.name}`} className="grid size-8 place-items-center rounded-lg hover:bg-stone-100" onClick={() => setIsOpen((value) => !value)}><MoreHorizontal /></button>{isOpen && <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border bg-white p-1.5 shadow-xl dark:bg-stone-900">{account.kind === "MEMBER" && <button className="menu-action" onClick={() => run(onEdit)}><Pencil /> Editar datos y accesos</button>}{account.kind === "MEMBER" && <button className="menu-action" onClick={() => run(onToggle)}><Power /> {account.active ? "Desactivar acceso" : "Reactivar acceso"}</button>}<button className="menu-action text-rose-700" onClick={() => run(onDelete)}><Trash2 /> {account.kind === "MEMBER" ? "Retirar cuenta" : "Revocar invitación"}</button></div>}</div>; }

function AccountForm({ account, draft: initial, roles, companies, onClose, onSave }: { account: Account | null; draft: Draft; roles: Role[]; companies: Company[]; onClose: () => void; onSave: (draft: Draft) => Promise<void> }) { const [draft, setDraft] = useState(initial); const [saving, setSaving] = useState(false); const selectedRole = roles.find(({ id }) => id === draft.roleId); const firmWide = selectedRole?.slug === "administrador"; const valid = draft.name.trim() && draft.position.trim() && draft.profession.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) && Boolean(draft.roleId) && (firmWide || draft.companyIds.length > 0); const field = (key: "name" | "email" | "position" | "profession" | "roleId") => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((current) => ({ ...current, [key]: event.target.value, ...(key === "roleId" && roles.find(({ id }) => id === event.target.value)?.slug === "administrador" ? { companyIds: [] } : {}) })); const toggleCompany = (id: string) => setDraft((current) => ({ ...current, companyIds: current.companyIds.includes(id) ? current.companyIds.filter((value) => value !== id) : [...current.companyIds, id] })); return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4" role="dialog" aria-modal="true"><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-stone-900"><header className="sticky top-0 flex items-start justify-between border-b bg-white p-5 dark:bg-stone-900"><div><h2 className="text-lg font-semibold">{account ? "Editar cuenta" : "Crear cuenta del equipo"}</h2><p className="mt-1 text-sm text-stone-500">{account ? "Actualiza identidad, rol y alcance." : "Creará una invitación segura de 48 horas."}</p></div><button onClick={onClose}><X /></button></header><div className="space-y-6 p-5"><section className="grid gap-4 sm:grid-cols-2"><Field label="Nombre completo"><Input className="field mt-1.5" onChange={field("name")} value={draft.name} /></Field><Field label="Correo de acceso"><Input className="field mt-1.5" disabled={Boolean(account)} onChange={field("email")} type="email" value={draft.email} /></Field><Field label="Cargo"><Input className="field mt-1.5" onChange={field("position")} value={draft.position} /></Field><Field label="Profesión"><Input className="field mt-1.5" onChange={field("profession")} value={draft.profession} /></Field></section><section className="border-t pt-5"><Field label="Rol"><SimpleSelect className="field mt-1.5" onChange={field("roleId")} value={draft.roleId}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SimpleSelect></Field><p className="mt-2 text-xs text-stone-500">{selectedRole?.description}</p></section><section className="border-t pt-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Empresas autorizadas</h3><span className="text-xs text-stone-500">{firmWide ? "Toda la firma" : `${draft.companyIds.length} seleccionadas`}</span></div>{firmWide ? <p className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Administrador tiene alcance completo de firma.</p> : companies.length === 0 ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Primero debes registrar una empresa para asignar un Supervisor o Colaborador.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{companies.map((company) => <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm" key={company.id}><input checked={draft.companyIds.includes(company.id)} onChange={() => toggleCompany(company.id)} type="checkbox" /><span>{company.legalName}</span></label>)}</div>}</section></div><footer className="flex justify-end gap-2 border-t p-5"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-[#14352d]" disabled={!valid || saving} onClick={async () => { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }}>{saving ? "Guardando…" : account ? "Guardar cambios" : "Crear invitación"}</Button></footer></section></div>; }

function DeleteAccount({ account, confirmation, onChange, onClose, onConfirm }: { account: Account; confirmation: string; onChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4" role="dialog" aria-modal="true"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-rose-600" /><div><h2 className="text-lg font-semibold">{account.kind === "MEMBER" ? `Retirar a ${account.name}` : "Revocar invitación"}</h2><p className="mt-1 text-sm leading-6 text-stone-600">{account.kind === "MEMBER" ? "Se revocarán sesiones y asignaciones activas. La identidad y auditoría se conservarán." : "El enlace dejará de funcionar inmediatamente."}</p></div></div>{account.kind === "MEMBER" && <Field label="Escribe ELIMINAR para confirmar"><Input className="field mt-1.5" onChange={(event) => onChange(event.target.value)} value={confirmation} /></Field>}<div className="mt-6 flex justify-end gap-2"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-rose-600 text-white" disabled={account.kind === "MEMBER" && confirmation !== "ELIMINAR"} onClick={onConfirm}>{account.kind === "MEMBER" ? "Retirar acceso" : "Revocar"}</Button></div></section></div>; }
function StatusBadge({ status }: { status: string }) { const tone = status === "Activa" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "Invitación pendiente" ? "border-amber-200 bg-amber-50 text-amber-700" : status === "Invitación vencida" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-stone-200 bg-stone-100 text-stone-600"; return <Badge className={tone} variant="outline">{status}</Badge>; }
function SortHead({ active, direction, label, onClick }: { active: boolean; direction: "asc" | "desc"; label: string; onClick: () => void }) { return <TableHead><button className="inline-flex items-center gap-1" onClick={onClick}>{label}{active ? direction === "asc" ? <ArrowUp /> : <ArrowDown /> : <ArrowUpDown />}</button></TableHead>; }
function Summary({ icon: Icon, label, value, detail }: { icon: typeof UserCheck; label: string; value: string; detail: string }) { return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon /></span></CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-4 block text-sm font-medium">{label}{children}</label>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
