"use client";;
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type AccountStatus = "Activa" | "Invitación pendiente" | "Desactivada";
type AccountRole = "Administrador" | "Supervisor" | "Colaborador";
type Account = {
  id: number;
  name: string;
  position: string;
  profession: string;
  email: string;
  role: AccountRole;
  companies: string[];
  status: AccountStatus;
  lastAccess: string;
};
type Draft = Omit<Account, "id" | "status" | "lastAccess">;
type SortKey = "name" | "position" | "role" | "status";

const companies = [
  "Distribuidora El Roble, C.A.",
  "Inversiones Costa Azul, C.A.",
  "Servicios Maracay, C.A.",
  "Constructora Ferresum, C.A.",
  "Nueva Confitería del Sur, C.A.",
  "Proyecto Trébol, C.A.",
  "Comercializadora San Miguel, C.A.",
  "Alimentos La Montaña, C.A.",
];

const seed: Account[] = [
  { id: 1, name: "María Pérez", position: "Contadora senior", profession: "Lic. en Contaduría Pública", email: "maria.perez@firma.com", role: "Supervisor", companies: companies.slice(0, 6), status: "Activa", lastAccess: "Hoy · 8:42 a. m." },
  { id: 2, name: "José Torres", position: "Analista tributario", profession: "TSU en Administración Tributaria", email: "jose.torres@firma.com", role: "Colaborador", companies: [companies[0], companies[2], companies[3], companies[5]], status: "Activa", lastAccess: "Ayer · 5:18 p. m." },
  { id: 3, name: "Andrea Castillo", position: "Asistente contable", profession: "Estudiante de Contaduría Pública", email: "andrea.castillo@firma.com", role: "Colaborador", companies: [companies[1], companies[3], companies[6]], status: "Activa", lastAccess: "Hoy · 9:06 a. m." },
  { id: 4, name: "Carlos Rojas", position: "Contador", profession: "Lic. en Contaduría Pública", email: "carlos.rojas@firma.com", role: "Colaborador", companies: [companies[4], companies[5]], status: "Activa", lastAccess: "29 jul · 3:45 p. m." },
  { id: 5, name: "Daniela Ruiz", position: "Asistente administrativa", profession: "TSU en Administración", email: "daniela.ruiz@firma.com", role: "Colaborador", companies: [companies[7]], status: "Invitación pendiente", lastAccess: "Sin acceso" },
  { id: 6, name: "Rafael Mendoza", position: "Consultor externo", profession: "Lic. en Contaduría Pública", email: "rafael.mendoza@firma.com", role: "Colaborador", companies: [], status: "Desactivada", lastAccess: "12 jun · 11:20 a. m." },
];

const blankDraft: Draft = { name: "", position: "", profession: "", email: "", role: "Colaborador", companies: [] };

export function TeamAccounts() {
  const [accounts, setAccounts] = useState(seed);
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

  const filtered = useMemo(() => accounts
    .filter((account) => `${account.name} ${account.email} ${account.position} ${account.profession} ${account.companies.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .filter((account) => statusFilter === "Todos los estados" || account.status === statusFilter)
    .filter((account) => roleFilter === "Todos los roles" || account.role === roleFilter)
    .sort((a, b) => a[sortKey].localeCompare(b[sortKey], "es") * (sortDirection === "asc" ? 1 : -1)),
  [accounts, query, statusFilter, roleFilter, sortKey, sortDirection]);

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = pageSize === "all" ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = filtered.length === 0 ? 0 : pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1;
  const lastRow = pageSize === "all" ? filtered.length : Math.min(currentPage * pageSize, filtered.length);

  function sort(key: SortKey) {
    if (key === sortKey) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  }

  function save(draft: Draft, sendInvite: boolean) {
    if (form?.account) {
      setAccounts((items) => items.map((account) => account.id === form.account?.id ? { ...account, ...draft } : account));
      showNotice("Los datos y permisos de la cuenta fueron actualizados.");
    } else {
      setAccounts((items) => [...items, { ...draft, id: Math.max(0, ...items.map((account) => account.id)) + 1, status: "Invitación pendiente", lastAccess: "Sin acceso" }]);
      showNotice(sendInvite ? `Invitación preparada para ${draft.email}.` : "Cuenta guardada con invitación pendiente.");
    }
    setForm(null);
  }

  function toggleStatus(account: Account) {
    const next: AccountStatus = account.status === "Desactivada" ? "Activa" : "Desactivada";
    setAccounts((items) => items.map((item) => item.id === account.id ? { ...item, status: next } : item));
    showNotice(next === "Activa" ? `Acceso de ${account.name} reactivado.` : `Acceso de ${account.name} desactivado.`);
  }

  function remove() {
    if (!deleting || confirmation !== "ELIMINAR") return;
    setAccounts((items) => items.filter((account) => account.id !== deleting.id));
    showNotice(`Cuenta de ${deleting.name} eliminada de esta vista.`);
    setDeleting(null);
    setConfirmation("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      {notice && <div className="fixed right-4 top-22 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl dark:border-emerald-900 dark:bg-stone-900 dark:text-stone-200">{notice}</div>}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Equipo / Accesos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cuentas del equipo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Administra identidad, permisos y empresas visibles para cada integrante de la firma.</p>
        </div>
        <Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={() => setForm({ draft: blankDraft, account: null })}><Plus size={16} /> Nueva cuenta</Button>
      </div>
      <nav className="mt-7 flex gap-6 border-b border-stone-200 text-sm dark:border-stone-800" aria-label="Secciones de equipo">
        <Link className="px-1 pb-3 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100" href="/equipo">Supervisión</Link>
        <Link className="border-b-2 border-[#14352d] px-1 pb-3 font-medium text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" href="/equipo/cuentas">Cuentas y accesos</Link>
      </nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Summary icon={UserCheck} label="Cuentas activas" value={String(accounts.filter((account) => account.status === "Activa").length)} detail="Con acceso a la firma" />
        <Summary icon={Mail} label="Invitaciones pendientes" value={String(accounts.filter((account) => account.status === "Invitación pendiente").length)} detail="Aún no han creado contraseña" />
        <Summary icon={Building2} label="Empresas asignadas" value={String(new Set(accounts.flatMap((account) => account.companies)).size)} detail="Con al menos un responsable" />
      </div>
      <Card className="mt-6 overflow-visible border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={17} />
              <Input className="field pl-9" onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, correo, cargo, profesión o empresa..." value={query} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SimpleSelect className="field w-auto min-w-44" onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} value={statusFilter}><option>Todos los estados</option><option>Activa</option><option>Invitación pendiente</option><option>Desactivada</option></SimpleSelect>
              <SimpleSelect className="field w-auto min-w-40" onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} value={roleFilter}><option>Todos los roles</option><option>Administrador</option><option>Supervisor</option><option>Colaborador</option></SimpleSelect>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4 overflow-visible border-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[1080px] text-left text-sm">
            <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/60">
              <TableRow>
                <SortHead active={sortKey === "name"} direction={sortDirection} label="Integrante" onClick={() => sort("name")} />
                <SortHead active={sortKey === "position"} direction={sortDirection} label="Cargo y profesión" onClick={() => sort("position")} />
                <SortHead active={sortKey === "role"} direction={sortDirection} label="Rol de acceso" onClick={() => sort("role")} />
                <TableHead className="px-4 py-3">Empresas asignadas</TableHead>
                <SortHead active={sortKey === "status"} direction={sortDirection} label="Estado" onClick={() => sort("status")} />
                <TableHead className="px-4 py-3">Último acceso</TableHead>
                <TableHead className="px-5 py-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
              {rows.map((account) => (
                <TableRow className="transition hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={account.id}>
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9"><AvatarFallback className="bg-stone-100 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">{initials(account.name)}</AvatarFallback></Avatar>
                      <div><p className="font-semibold">{account.name}</p><p className="mt-0.5 text-xs text-stone-500">{account.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-4"><p className="font-medium">{account.position}</p><p className="mt-0.5 max-w-56 truncate text-xs text-stone-500">{account.profession}</p></TableCell>
                  <TableCell className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-sm"><ShieldCheck className="text-stone-400" size={15} /> {account.role}</span></TableCell>
                  <TableCell className="px-4 py-4"><CompanyAccess companies={account.companies} /></TableCell>
                  <TableCell className="px-4 py-4"><StatusBadge status={account.status} /></TableCell>
                  <TableCell className="px-4 py-4 text-xs text-stone-500">{account.lastAccess}</TableCell>
                  <TableCell className="px-5 py-4 text-right"><AccountActions account={account} onDelete={() => { setDeleting(account); setConfirmation(""); }} onEdit={() => setForm({ account, draft: { name: account.name, position: account.position, profession: account.profession, email: account.email, role: account.role, companies: account.companies } })} onInvite={() => showNotice(`Invitación preparada para ${account.email}.`)} onReset={() => showNotice(`Enlace seguro de restablecimiento preparado para ${account.email}.`)} onToggle={() => toggleStatus(account)} /></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={7}>No hay cuentas que coincidan con los filtros.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-stone-500"><span>Mostrando {firstRow}–{lastRow} de {filtered.length}</span><label className="flex items-center gap-2 text-xs">Mostrar <SimpleSelect className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-800" onChange={(event) => { setPageSize(event.target.value === "all" ? "all" : Number(event.target.value) as 25 | 50); setPage(1); }} value={pageSize}><option value="25">25</option><option value="50">50</option><option value="all">Todos</option></SimpleSelect></label></div>
          <div className="flex items-center gap-2"><Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline"><ChevronLeft size={15} /> Anterior</Button><span className="min-w-20 text-center text-xs text-stone-500">Página {currentPage} de {totalPages}</span><Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">Siguiente <ChevronRight size={15} /></Button></div>
        </div>
      </Card>
      <div className="mt-4 flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"><ShieldCheck className="mt-0.5 shrink-0" size={18} /><p className="leading-6"><strong>Acceso mínimo necesario.</strong> Cada integrante solo debe ver las empresas que tiene asignadas. Los cambios de rol, acceso y empresas deben quedar en el registro de auditoría al conectar el backend.</p></div>
      {form && <AccountForm account={form.account} draft={form.draft} onClose={() => setForm(null)} onSave={save} />}
      {deleting && <DeleteAccount account={deleting} confirmation={confirmation} onChange={setConfirmation} onClose={() => setDeleting(null)} onConfirm={remove} />}
    </div>
  );
}

function AccountActions({ account, onEdit, onInvite, onReset, onToggle, onDelete }: { account: Account; onEdit: () => void; onInvite: () => void; onReset: () => void; onToggle: () => void; onDelete: () => void }) {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const run = (action: () => void) => { setIsOpen(false); action(); };
  return <div className="relative inline-block text-left" ref={ref}><button className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button" aria-expanded={isOpen} aria-label={`Acciones de ${account.name}`}><MoreHorizontal size={18} /></button>{isOpen && <div className="absolute right-0 top-9 z-20 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900"><button className="menu-action" onClick={() => run(onEdit)} type="button"><Pencil size={15} /> Editar datos y accesos</button>{account.status === "Invitación pendiente" && <button className="menu-action" onClick={() => run(onInvite)} type="button"><Send size={15} /> Reenviar invitación</button>}<button className="menu-action" disabled={account.status === "Invitación pendiente"} onClick={() => run(onReset)} type="button"><KeyRound size={15} /> Restablecer contraseña</button><div className="my-1 border-t border-stone-100 dark:border-stone-800" /><button className="menu-action" onClick={() => run(onToggle)} type="button"><Power size={15} /> {account.status === "Desactivada" ? "Reactivar acceso" : "Desactivar acceso"}</button><button className="menu-action text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950" onClick={() => run(onDelete)} type="button"><Trash2 size={15} /> Eliminar cuenta</button></div>}</div>;
}

function AccountForm({ account, draft: initial, onClose, onSave }: { account: Account | null; draft: Draft; onClose: () => void; onSave: (draft: Draft, sendInvite: boolean) => void }) {
  const [draft, setDraft] = useState(initial);
  const field = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft({ ...draft, [key]: event.target.value });
  const valid = draft.name.trim() && draft.position.trim() && draft.profession.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
  const toggleCompany = (company: string) => setDraft((current) => ({ ...current, companies: current.companies.includes(company) ? current.companies.filter((item) => item !== company) : [...current.companies, company] }));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 p-4" role="dialog" aria-modal="true" aria-label={account ? "Editar cuenta" : "Nueva cuenta"}><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-stone-900"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"><div><h2 className="text-lg font-semibold">{account ? "Editar cuenta" : "Crear cuenta del equipo"}</h2><p className="mt-1 text-sm text-stone-500">{account ? "Actualiza su identidad, rol y alcance por empresa." : "La persona recibirá una invitación para crear su contraseña."}</p></div><button className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={onClose} type="button" aria-label="Cerrar"><X size={19} /></button></header><div className="space-y-7 p-5"><section><div className="flex items-center gap-2"><UserRound size={17} className="text-[#14352d] dark:text-emerald-300" /><h3 className="font-semibold">Información profesional</h3></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Nombre completo *"><Input autoFocus className="field mt-1.5" onChange={field("name")} placeholder="Nombre y apellido" value={draft.name} /></Field><Field label="Correo de acceso *"><Input className="field mt-1.5" onChange={field("email")} placeholder="nombre@firma.com" type="email" value={draft.email} /></Field><Field label="Cargo *"><Input className="field mt-1.5" onChange={field("position")} placeholder="Ej. Analista tributario" value={draft.position} /></Field><Field label="Profesión *"><Input className="field mt-1.5" onChange={field("profession")} placeholder="Ej. Lic. en Contaduría Pública" value={draft.profession} /></Field></div></section><section className="border-t border-stone-100 pt-6 dark:border-stone-800"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#14352d] dark:text-emerald-300" /><h3 className="font-semibold">Rol y permisos</h3></div><label className="mt-4 block text-sm font-medium">Rol de acceso<SimpleSelect className="field mt-1.5" onChange={field("role")} value={draft.role}><option>Administrador</option><option>Supervisor</option><option>Colaborador</option></SimpleSelect></label><RoleHelp role={draft.role} /></section><section className="border-t border-stone-100 pt-6 dark:border-stone-800"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Building2 size={17} className="text-[#14352d] dark:text-emerald-300" /><h3 className="font-semibold">Empresas bajo responsabilidad</h3></div><span className="text-xs text-stone-500">{draft.companies.length} seleccionadas</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{companies.map((company) => { const checked = draft.companies.includes(company); return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"}`} key={company}><input checked={checked} className="sr-only" onChange={() => toggleCompany(company)} type="checkbox" /><span className={`grid size-5 shrink-0 place-items-center rounded border ${checked ? "border-[#14352d] bg-[#14352d] text-white" : "border-stone-300 dark:border-stone-600"}`}>{checked && <Check size={13} />}</span><span>{company}</span></label>; })}</div></section>{!account && <div className="flex gap-3 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/60"><Mail className="mt-0.5 shrink-0 text-stone-500" size={18} /><p className="text-xs leading-5 text-stone-600 dark:text-stone-300">La invitación será de un solo uso. La firma no conocerá la contraseña creada por el integrante. El envío real requiere conectar el servicio de correo y autenticación.</p></div>}</div><footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-stone-100 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:justify-end"><Button onClick={onClose} variant="outline">Cancelar</Button>{!account && <Button disabled={!valid} onClick={() => onSave(draft, false)} variant="outline">Guardar sin enviar</Button>}<Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!valid} onClick={() => onSave(draft, !account)}>{account ? "Guardar cambios" : <><Send size={15} /> Crear y enviar invitación</>}</Button></footer></section></div>;
}

function DeleteAccount({ account, confirmation, onChange, onClose, onConfirm }: { account: Account; confirmation: string; onChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4" role="dialog" aria-modal="true" aria-label="Eliminar cuenta"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"><AlertTriangle size={20} /></span><div><h2 className="text-lg font-semibold">Eliminar la cuenta de {account.name}</h2><p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">Perderá el acceso a {account.companies.length} empresas. Sus asignaciones deberán transferirse antes de eliminarla. El historial de actividad y auditoría debe conservarse.</p></div></div><label className="mt-5 block text-sm font-medium">Escribe <span className="font-bold text-rose-700">ELIMINAR</span> para confirmar<Input autoComplete="off" className="field mt-1.5 border-rose-200 focus:border-rose-600" onChange={(event) => onChange(event.target.value)} placeholder="ELIMINAR" value={confirmation} /></label><div className="mt-6 flex justify-end gap-2"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={confirmation !== "ELIMINAR"} onClick={onConfirm}>Eliminar cuenta</Button></div></section></div>;
}

function RoleHelp({ role }: { role: AccountRole }) {
  const descriptions: Record<AccountRole, string> = { Administrador: "Gestiona toda la firma, usuarios, configuración y empresas.", Supervisor: "Revisa trabajo y supervisa las empresas que tiene asignadas.", Colaborador: "Ejecuta tareas y consulta únicamente sus empresas asignadas." };
  return <p className="mt-2 text-xs leading-5 text-stone-500">{descriptions[role]}</p>;
}

function CompanyAccess({ companies: assigned }: { companies: string[] }) {
  if (assigned.length === 0) return <span className="text-xs text-stone-400">Sin empresas</span>;
  return <div className="flex items-center gap-1.5"><span className="grid size-7 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Building2 size={14} /></span><span className="font-medium">{assigned.length}</span><span className="text-xs text-stone-500">{assigned.length === 1 ? "empresa" : "empresas"}</span></div>;
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const styles: Record<AccountStatus, string> = { Activa: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300", "Invitación pendiente": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300", Desactivada: "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300" };
  return <Badge className={styles[status]} variant="outline">{status}</Badge>;
}

function SortHead({ active, direction, label, onClick }: { active: boolean; direction: "asc" | "desc"; label: string; onClick: () => void }) {
  return <TableHead className="px-4 py-3"><button className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-stone-100" onClick={onClick} type="button">{label}{active ? direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : <ArrowUpDown size={14} />}</button></TableHead>;
}

function Summary({ icon: Icon, label, value, detail }: { icon: typeof UserCheck; label: string; value: string; detail: string }) {
  return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={18} /></span></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-medium">{label}{children}</label>;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
