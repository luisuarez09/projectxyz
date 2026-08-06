"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
  UserMinus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BranchOption, EmployeeDetail, EmployeeFormData, EmployeeStatus, EmployeeSummary } from "@/modules/firm/employees/domain/employee";
import { employeeStatusClass, employeeStatusLabel } from "@/modules/firm/employees/domain/employee";

const statuses: EmployeeStatus[] = ["ACTIVE", "ON_VACATION", "SICK_LEAVE", "SUSPENDED", "RETIRED"];

const blankForm = (): EmployeeFormData => ({
  fullName: "",
  identity: "",
  birthDate: "",
  admissionDate: "",
  role: "",
  department: "",
  branchId: "",
  contractType: "Tiempo indeterminado",
  schedule: "",
  gender: "",
  address: "",
  phone: "",
  salary: "",
  salaryCurrency: "USD",
  foodBonus: "40",
  status: "ACTIVE",
});

export function EmployeesDirectory() {
  const { activeCompany } = useCompanyContext();

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | "all">(25);
  const [menu, setMenu] = useState<string | null>(null);
  const [tableMenu, setTableMenu] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState(1);
  const [draft, setDraft] = useState<EmployeeFormData>(blankForm());
  const [saving, setSaving] = useState(false);

  const [retiringEmployeeId, setRetiringEmployeeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/employees", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar el directorio.");
      setEmployees(body.employees as EmployeeSummary[]);
      setBranches(body.branches as BranchOption[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, activeCompany?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => statusFilter === "Todos" || e.status === statusFilter)
      .filter((e) =>
        `${e.fullName} ${e.identity} ${e.phone ?? ""} ${e.role ?? ""} ${e.department ?? ""}`.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort === "admission"
          ? b.admissionDate.localeCompare(a.admissionDate)
          : sort === "department"
            ? (a.department ?? "").localeCompare(b.department ?? "")
            : a.fullName.localeCompare(b.fullName),
      );
  }, [employees, query, sort, statusFilter]);

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = pageSize === "all" ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const first = filtered.length === 0 ? 0 : pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1;
  const last = pageSize === "all" ? filtered.length : Math.min(currentPage * pageSize, filtered.length);

  function openCreate() {
    setEditingId(null);
    setEditingVersion(1);
    setDraft(blankForm());
    setFormOpen(true);
  }

  async function openEdit(id: string) {
    setMenu(null);
    try {
      const res = await fetch(`/api/employees/${id}`, { cache: "no-store" });
      const body = await res.json() as { employee: EmployeeDetail };
      if (!res.ok) throw new Error();
      const e = body.employee;
      setEditingId(id);
      setEditingVersion(e.version);
      setDraft({
        fullName: e.fullName,
        identity: e.identity,
        birthDate: e.birthDate ?? "",
        admissionDate: e.admissionDate,
        role: e.role ?? "",
        department: e.department ?? "",
        branchId: e.branchId ?? "",
        contractType: e.contractType ?? "Tiempo indeterminado",
        schedule: e.schedule ?? "",
        gender: e.gender ?? "",
        address: e.address ?? "",
        phone: e.phone ?? "",
        salary: e.salary,
        salaryCurrency: e.salaryCurrency,
        foodBonus: e.foodBonus,
        status: e.status,
      });
      setFormOpen(true);
    } catch {
      setNotice("No fue posible cargar los datos del empleado.");
    }
  }

  async function save() {
    if (!draft.fullName.trim() || !draft.identity.trim() || !draft.admissionDate) return;
    setSaving(true);
    setNotice("");
    try {
      const payload = editingId
        ? { ...draft, version: editingVersion }
        : draft;
      const url = editingId ? `/api/employees/${editingId}` : "/api/employees";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al guardar.");
      setFormOpen(false);
      setNotice(editingId ? "Ficha actualizada correctamente." : "Empleado registrado correctamente.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function exportRows() {
    const header = ["Empleado", "Cédula", "Teléfono", "Cargo", "Departamento", "Ingreso", "Estado"];
    const body = filtered.map((e) => [
      e.fullName,
      e.identity,
      e.phone ?? "",
      e.role ?? "",
      e.department ?? "",
      e.admissionDate,
      employeeStatusLabel[e.status],
    ]);
    const csv = [header, ...body].map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    ).join("\n");
    download(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), "directorio-empleados.csv");
    setTableMenu(false);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">{activeCompany?.legalName ?? "Empresa activa"} / Empleados</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Directorio de empleados</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Ficha personal, relación laboral, remuneración de referencia y medios de pago.
          </p>
        </div>
        <Button className="h-9 bg-[#14352d] hover:bg-[#0e2821]" onClick={openCreate}>
          <Plus /> Registrar empleado
        </Button>
      </header>

      {notice && (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </p>
      )}

      <section className="mt-7 overflow-visible rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
            <Input
              className="field pl-9"
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, cédula, teléfono o cargo..."
              value={query}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SimpleSelect
              aria-label="Filtrar por estado"
              className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-800"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              value={statusFilter}
            >
              <option>Todos</option>
              {statuses.map((s) => <option key={s} value={s}>{employeeStatusLabel[s]}</option>)}
            </SimpleSelect>
            <SimpleSelect
              aria-label="Ordenar empleados"
              className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-800"
              onChange={(e) => setSort(e.target.value)}
              value={sort}
            >
              <option value="name">Nombre A–Z</option>
              <option value="department">Departamento</option>
              <option value="admission">Ingreso reciente</option>
            </SimpleSelect>
            <label className="flex items-center gap-2 text-xs text-stone-500">
              Mostrar
              <SimpleSelect
                className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                onChange={(e) => { setPageSize(e.target.value === "all" ? "all" : Number(e.target.value) as 25 | 50); setPage(1); }}
                value={pageSize}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Todos</option>
              </SimpleSelect>
            </label>
            <div className="relative">
              <Button aria-expanded={tableMenu} aria-label="Acciones del directorio" onClick={() => setTableMenu((o) => !o)} size="icon-sm" variant="outline">
                <MoreHorizontal />
              </Button>
              {tableMenu && (
                <div className="absolute right-0 top-9 z-30 w-48 rounded-lg border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                  <button className="menu-action" onClick={exportRows} type="button">
                    <Download size={16} /> Exportar directorio
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1020px]">
            <TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900/50">
              <TableRow>
                <TableHead className="px-5 py-3">Empleado</TableHead>
                <TableHead className="px-5 py-3">Cargo</TableHead>
                <TableHead className="px-5 py-3">Contacto</TableHead>
                <TableHead className="px-5 py-3">Ingreso</TableHead>
                <TableHead className="px-5 py-3">Salario de referencia</TableHead>
                <TableHead className="px-5 py-3">Estado</TableHead>
                <TableHead className="px-5 py-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell className="px-5 py-12 text-center text-stone-400" colSpan={7}>
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && error && (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-rose-600" colSpan={7}>{error}</TableCell>
                </TableRow>
              )}
              {!loading && !error && rows.map((e) => (
                <TableRow className="hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={e.id}>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800">
                        <UserRound size={17} />
                      </span>
                      <div>
                        <Link className="font-medium hover:underline" href={`/empleados/${e.id}`}>{e.fullName}</Link>
                        <p className="mt-0.5 text-xs text-stone-500">{e.identity} · {e.branchName ?? "Sin sucursal"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <p className="font-medium">{e.role ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{e.department ?? "—"}</p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <p>{e.phone ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-stone-500">Teléfono y pago móvil</p>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-stone-600 dark:text-stone-300">{formatDate(e.admissionDate)}</TableCell>
                  <TableCell className="px-5 py-4">
                    <p className="font-medium">{Number(e.salary).toLocaleString("es-VE")} {e.salaryCurrency}</p>
                    <p className="mt-0.5 text-xs text-stone-500">Monto mensual acordado</p>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${employeeStatusClass[e.status]}`}>
                      {employeeStatusLabel[e.status]}
                    </span>
                  </TableCell>
                  <TableCell className="relative px-5 py-4">
                    <div className="flex justify-end">
                      <Popover>
                        <PopoverTrigger render={<Button aria-label={`Acciones de ${e.fullName}`} size="icon-sm" variant="ghost" />}>
                          <MoreHorizontal />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48 p-1">
                          <Link className="menu-action" href={`/empleados/${e.id}`}><Eye size={16} /> Ver ficha</Link>
                          <button className="menu-action" onClick={() => openEdit(e.id)} type="button"><Edit3 size={16} /> Editar datos</button>
                          <button className="menu-action text-rose-700" onClick={() => setRetiringEmployeeId(e.id)} type="button"><UserMinus size={16} /> Registrar retiro</button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !error && rows.length === 0 && (
                <TableRow>
                  <TableCell className="px-5 py-12 text-center text-stone-500" colSpan={7}>
                    No se encontraron empleados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-stone-500">Mostrando {first}–{last} de {filtered.length} registros</p>
          <div className="flex items-center gap-2">
            <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline">
              <ChevronLeft /> Anterior
            </Button>
            <span className="min-w-20 text-center text-xs text-stone-500">Página {currentPage} de {totalPages}</span>
            <Button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">
              Siguiente <ChevronRight />
            </Button>
          </div>
        </div>
      </section>

      {formOpen && (
        <EmployeeDialog
          branches={branches}
          draft={draft}
          editing={editingId !== null}
          onChange={setDraft}
          onClose={() => setFormOpen(false)}
          onSave={save}
          saving={saving}
        />
      )}
    </main>
  );
}

// ─── Diálogo de creación / edición ────────────────────────────────────────

function EmployeeDialog({
  branches,
  draft,
  editing,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  branches: BranchOption[];
  draft: EmployeeFormData;
  editing: boolean;
  onChange: (d: EmployeeFormData) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const field =
    (key: keyof EmployeeFormData) =>
      (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        onChange({ ...draft, [key]: event.target.value });

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="dialog">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <header className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">{editing ? "Editar empleado" : "Registrar empleado"}</h2>
            <p className="mt-1 text-sm text-stone-500">Datos personales, relación laboral y remuneración acordada.</p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button>
        </header>
        <div className="overflow-y-auto p-5">
          <FormSection title="Datos personales">
            <Field label="Nombre completo *"><Input className="field mt-1.5" onChange={field("fullName")} value={draft.fullName} /></Field>
            <Field label="Cédula de identidad *"><Input className="field mt-1.5" onChange={field("identity")} placeholder="V-12.345.678" value={draft.identity} /></Field>
            <Field label="Número de teléfono"><Input className="field mt-1.5" onChange={field("phone")} placeholder="0414-000-0000" value={draft.phone} /></Field>
            <Field label="Fecha de nacimiento"><Input className="field mt-1.5" onChange={field("birthDate")} type="date" value={draft.birthDate} /></Field>
            <Field label="Género">
              <SimpleSelect className="field mt-1.5" onChange={field("gender")} value={draft.gender}>
                <option value="">Seleccionar</option>
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro</option>
                <option>Prefiere no indicar</option>
              </SimpleSelect>
            </Field>
            <Field wide label="Dirección">
              <textarea className="field mt-1.5 min-h-20 py-2" onChange={field("address")} value={draft.address} />
            </Field>
          </FormSection>

          <FormSection title="Relación laboral">
            <Field label="Fecha de ingreso *"><Input className="field mt-1.5" onChange={field("admissionDate")} type="date" value={draft.admissionDate} /></Field>
            <Field label="Cargo"><Input className="field mt-1.5" onChange={field("role")} value={draft.role} /></Field>
            <Field label="Departamento"><Input className="field mt-1.5" onChange={field("department")} value={draft.department} /></Field>
            <Field label="Sucursal">
              <SimpleSelect className="field mt-1.5" onChange={field("branchId")} value={draft.branchId}>
                <option value="">Sin sucursal específica</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </SimpleSelect>
            </Field>
            <Field label="Tipo de contrato">
              <SimpleSelect className="field mt-1.5" onChange={field("contractType")} value={draft.contractType}>
                <option>Tiempo indeterminado</option>
                <option>Tiempo determinado</option>
                <option>Por obra determinada</option>
              </SimpleSelect>
            </Field>
            <Field label="Horario"><Input className="field mt-1.5" onChange={field("schedule")} value={draft.schedule} /></Field>
            <Field label="Estado">
              <SimpleSelect className="field mt-1.5" onChange={field("status")} value={draft.status}>
                {statuses.map((s) => <option key={s} value={s}>{employeeStatusLabel[s]}</option>)}
              </SimpleSelect>
            </Field>
          </FormSection>

          <FormSection title="Remuneración">
            <Field label="Salario acordado mensual"><Input className="field mt-1.5" min="0" onChange={field("salary")} type="number" step="0.01" value={draft.salary} /></Field>
            <Field label="Divisa de referencia">
              <SimpleSelect className="field mt-1.5" onChange={field("salaryCurrency")} value={draft.salaryCurrency}>
                <option>USD</option>
                <option>EUR</option>
              </SimpleSelect>
            </Field>
            <Field label="Bono de alimentación mensual"><Input className="field mt-1.5" min="0" onChange={field("foodBonus")} type="number" step="0.01" value={draft.foodBonus} /></Field>
          </FormSection>

          <p className="mt-5 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-500 dark:bg-stone-800">
            Después de guardar la ficha se pueden agregar cuentas bancarias y pagos móviles desde la ficha del empleado.
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!draft.fullName || !draft.identity || !draft.admissionDate || saving}
            onClick={onSave}
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? "Guardando…" : "Guardar empleado"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-1 border-b border-stone-100 py-5 first:pt-0 last:border-0 dark:border-stone-800">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
function Field({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  return <label className={`text-sm font-medium ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>{label}{children}</label>;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
