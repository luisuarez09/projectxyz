"use client";

import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Edit3,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Smartphone,
  Trash2,
  UserRound,
  UserMinus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  BranchOption,
  EmployeeDetail,
  EmployeeFormData,
  EmployeePaymentMethodRow,
  EmployeePaymentMethodType,
  EmployeeStatus,
  PaymentMethodInput,
} from "@/modules/firm/employees/domain/employee";
import {
  employeePaymentMethodLabel,
  employeeStatusClass,
  employeeStatusLabel,
} from "@/modules/firm/employees/domain/employee";

const statuses: EmployeeStatus[] = ["ACTIVE", "ON_VACATION", "SICK_LEAVE", "SUSPENDED", "RETIRED"];

export function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const { activeCompany } = useCompanyContext();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EmployeeFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const [retiring, setRetiring] = useState(false);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [empRes, listRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`, { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ]);
      const empBody = await empRes.json();
      const listBody = await listRes.json();
      if (!empRes.ok) throw new Error(empBody.error ?? "No fue posible cargar la ficha.");
      setEmployee(empBody.employee as EmployeeDetail);
      setBranches((listBody.branches as BranchOption[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { void loadEmployee(); }, [loadEmployee]);

  function openEdit() {
    if (!employee) return;
    setDraft({
      version: employee.version,
      fullName: employee.fullName,
      identity: employee.identity,
      birthDate: employee.birthDate ?? "",
      admissionDate: employee.admissionDate,
      role: employee.role ?? "",
      department: employee.department ?? "",
      branchId: employee.branchId ?? "",
      contractType: employee.contractType ?? "Tiempo indeterminado",
      schedule: employee.schedule ?? "",
      gender: employee.gender ?? "",
      address: employee.address ?? "",
      phone: employee.phone ?? "",
      salary: employee.salary,
      salaryCurrency: employee.salaryCurrency,
      foodBonus: employee.foodBonus,
      status: employee.status,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!draft || !employee) return;
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, version: employee.version }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al guardar.");
      setEmployee(body.employee as EmployeeDetail);
      setEditOpen(false);
      setNotice("Ficha actualizada correctamente.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function addPaymentMethod(input: PaymentMethodInput) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/payment-methods`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al agregar medio de pago.");
      setEmployee((prev) =>
        prev ? { ...prev, paymentMethods: [...prev.paymentMethods, body.method as EmployeePaymentMethodRow] } : prev,
      );
      setPaymentOpen(false);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error al agregar medio de pago.");
    }
  }

  async function removePaymentMethod(methodId: string) {
    setDeletingMethodId(methodId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/payment-methods/${methodId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar medio de pago.");
      setEmployee((prev) =>
        prev ? { ...prev, paymentMethods: prev.paymentMethods.filter((m) => m.id !== methodId) } : prev,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setDeletingMethodId(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </main>
    );
  }

  if (error || !employee) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Link className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-[#14352d]" href="/empleados/directorio">
          <ArrowLeft size={16} /> Volver al directorio
        </Link>
        <p className="mt-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300">
          {error || "Empleado no encontrado."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-[#14352d]" href="/empleados/directorio">
        <ArrowLeft size={16} /> Volver al directorio
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
            <UserRound size={25} />
          </span>
          <div>
            <p className="text-sm text-stone-500">{activeCompany?.legalName ?? "Empresa activa"} / Empleados / Ficha</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{employee.fullName}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${employeeStatusClass[employee.status]}`}>
                {employeeStatusLabel[employee.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-500">{employee.identity} · {employee.role ?? "—"} · {employee.department ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button onClick={() => setRetiring(true)} variant="outline" className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200">
            <UserMinus size={16} className="mr-2" /> Registrar retiro
          </Button>
          <Button onClick={openEdit} variant="outline"><Pencil size={16} className="mr-2" /> Editar ficha</Button>
        </div>
      </header>

      {notice && (
        <p className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">{notice}</p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Ingreso" value={formatDate(employee.admissionDate)} detail={`${yearsOfService(employee.admissionDate)} años de antigüedad`} />
        <Summary label="Contrato" value={employee.contractType ?? "—"} detail={employee.branchName ?? "Sin sucursal"} />
        <Summary label="Salario acordado" value={`${Number(employee.salary).toLocaleString("es-VE")} ${employee.salaryCurrency}`} detail="Referencia mensual" />
        <Summary label="Bono alimentación" value={`${Number(employee.foodBonus).toLocaleString("es-VE")} USD`} detail="Monto mensual individual" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:block">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Ficha del trabajador</p>
          {[["personal", "Datos personales"], ["laboral", "Relación laboral"], ["remuneracion", "Remuneración"], ["banco", "Medios de pago"]].map(([id, label]) => (
            <a className="block rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-[#14352d] dark:text-stone-300 dark:hover:bg-stone-800" href={`#${id}`} key={id}>{label}</a>
          ))}
        </aside>

        <div className="min-w-0 space-y-5">
          <ProfileCard icon={UserRound} id="personal" title="Datos personales" text="Identificación y contacto del trabajador.">
            <Details items={[
              ["Cédula", employee.identity],
              ["Teléfono", employee.phone ?? "—"],
              ["Nacimiento", employee.birthDate ? formatDate(employee.birthDate) : "—"],
              ["Género", employee.gender ?? "—"],
              ["Dirección", employee.address ?? "—"],
            ]} />
          </ProfileCard>

          <ProfileCard icon={BriefcaseBusiness} id="laboral" title="Relación laboral" text="Condiciones vigentes dentro de la empresa.">
            <Details items={[
              ["Cargo", employee.role ?? "—"],
              ["Departamento", employee.department ?? "—"],
              ["Sucursal", employee.branchName ?? "Sin sucursal"],
              ["Tipo de contrato", employee.contractType ?? "—"],
              ["Horario", employee.schedule ?? "—"],
              ["Fecha de ingreso", formatDate(employee.admissionDate)],
            ]} />
          </ProfileCard>

          <ProfileCard icon={Banknote} id="remuneracion" title="Remuneración de referencia" text="El pago y los recibos se expresan siempre en bolívares.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Salario mensual acordado" value={`${Number(employee.salary).toLocaleString("es-VE")} ${employee.salaryCurrency}`} />
              <Detail label="Bono de alimentación mensual" value={`${Number(employee.foodBonus).toLocaleString("es-VE")} USD`} />
              <Detail label="Fuente de conversión" value="Configuración laboral de la empresa" />
            </div>
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-500 dark:bg-stone-800">
              La tasa aplicada se fija y conserva al crear cada nómina; no modifica el salario acordado del trabajador.
            </p>
          </ProfileCard>

          <ProfileCard icon={CreditCard} id="banco" title="Medios de pago" text="Se pueden registrar varias cuentas bancarias y datos de pago móvil.">
            <div className="space-y-3">
              {employee.paymentMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  deleting={deletingMethodId === method.id}
                  onDelete={() => removePaymentMethod(method.id)}
                />
              ))}
              {employee.paymentMethods.length === 0 && (
                <p className="rounded-lg border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500 dark:border-stone-700">
                  No hay medios de pago registrados.
                </p>
              )}
            </div>
            <Button className="mt-4" onClick={() => setPaymentOpen(true)} variant="outline">
              <Plus /> Agregar medio de pago
            </Button>
          </ProfileCard>
        </div>
      </div>

      {editOpen && draft && (
        <EditDialog
          branches={branches}
          draft={draft}
          onChange={setDraft}
          onClose={() => setEditOpen(false)}
          onSave={saveEdit}
          saving={saving}
        />
      )}
      {paymentOpen && (
        <PaymentMethodDialog
          employee={employee}
          onClose={() => setPaymentOpen(false)}
          onSave={addPaymentMethod}
        />
      )}
      <Dialog onOpenChange={(open) => !open && setRetiring(false)} open={retiring}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar retiro</DialogTitle>
            <DialogDescription>
              Funcionalidad en desarrollo. Aquí se podrá registrar el retiro del trabajador y generar su liquidación en un futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button onClick={() => setRetiring(false)} variant="outline">Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ─── Tarjeta de medio de pago ─────────────────────────────────────────────

function PaymentMethodCard({ method, deleting, onDelete }: { method: EmployeePaymentMethodRow; deleting: boolean; onDelete: () => void }) {
  const Icon = method.type === "MOBILE_PAYMENT" ? Smartphone : CreditCard;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-stone-200 p-4 dark:border-stone-700">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <b className="text-sm">{employeePaymentMethodLabel[method.type]}</b>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{method.bank}</p>
        <p className="mt-0.5 text-xs text-stone-500">
          {method.type === "MOBILE_PAYMENT" ? `${method.phone ?? ""} · ${method.identity ?? ""}` : method.account ?? ""}
        </p>
      </div>
      <Button
        aria-label={`Eliminar ${employeePaymentMethodLabel[method.type]}`}
        className="text-rose-600"
        disabled={deleting}
        onClick={onDelete}
        size="icon-sm"
        variant="ghost"
      >
        {deleting ? <Loader2 className="animate-spin" size={15} /> : <Trash2 />}
      </Button>
    </div>
  );
}

// ─── Diálogo: agregar medio de pago ──────────────────────────────────────

function PaymentMethodDialog({
  employee,
  onClose,
  onSave,
}: {
  employee: EmployeeDetail;
  onClose: () => void;
  onSave: (input: PaymentMethodInput) => void;
}) {
  const [type, setType] = useState<EmployeePaymentMethodType>("BANK_TRANSFER");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [identity, setIdentity] = useState(employee.identity);

  function submit() {
    onSave({ type, bank, account, phone, identity });
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <header className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">Agregar medio de pago</h2>
            <p className="mt-1 text-sm text-stone-500">Transferencia bancaria o pago móvil.</p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button>
        </header>
        <div className="space-y-4 p-5">
          <label className="block text-sm font-medium">
            Tipo
            <SimpleSelect className="field mt-1.5" onChange={(e) => setType(e.target.value as EmployeePaymentMethodType)} value={type}>
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="MOBILE_PAYMENT">Pago móvil</option>
            </SimpleSelect>
          </label>
          <label className="block text-sm font-medium">
            Banco
            <Input className="field mt-1.5" onChange={(e) => setBank(e.target.value)} value={bank} />
          </label>
          {type === "BANK_TRANSFER" ? (
            <label className="block text-sm font-medium">
              Número de cuenta
              <Input className="field mt-1.5" onChange={(e) => setAccount(e.target.value)} placeholder="20 dígitos" value={account} />
            </label>
          ) : (
            <div className="grid gap-3 rounded-lg bg-stone-50 p-4 dark:bg-stone-800 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Teléfono
                <Input className="field mt-1.5" onChange={(e) => setPhone(e.target.value)} value={phone} />
              </label>
              <label className="block text-sm font-medium">
                Cédula
                <Input className="field mt-1.5" onChange={(e) => setIdentity(e.target.value)} value={identity} />
              </label>
              <p className="text-xs text-stone-500 sm:col-span-2">
                Se pre-llenan con los datos personales del empleado; puedes ajustarlos si es necesario.
              </p>
            </div>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!bank || (type === "BANK_TRANSFER" && !account)}
            onClick={submit}
          >
            Agregar
          </Button>
        </footer>
      </section>
    </div>
  );
}

// ─── Diálogo de edición de ficha ──────────────────────────────────────────

function EditDialog({
  branches,
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: {
  branches: BranchOption[];
  draft: EmployeeFormData;
  onChange: (d: EmployeeFormData) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const field =
    (key: keyof EmployeeFormData) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        onChange({ ...draft, [key]: event.target.value });

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="dialog">
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <header className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">Editar ficha del empleado</h2>
            <p className="mt-1 text-sm text-stone-500">Datos personales, relación laboral y remuneración.</p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button>
        </header>
        <div className="overflow-y-auto p-5">
          <EditSection title="Datos personales">
            <EditField label="Nombre completo *"><Input className="field mt-1.5" onChange={field("fullName")} value={draft.fullName} /></EditField>
            <EditField label="Cédula de identidad *"><Input className="field mt-1.5" onChange={field("identity")} value={draft.identity} /></EditField>
            <EditField label="Teléfono"><Input className="field mt-1.5" onChange={field("phone")} value={draft.phone} /></EditField>
            <EditField label="Fecha de nacimiento"><Input className="field mt-1.5" type="date" onChange={field("birthDate")} value={draft.birthDate} /></EditField>
            <EditField label="Género">
              <SimpleSelect className="field mt-1.5" onChange={field("gender")} value={draft.gender}>
                <option value="">Seleccionar</option>
                <option>Femenino</option>
                <option>Masculino</option>
                <option>Otro</option>
                <option>Prefiere no indicar</option>
              </SimpleSelect>
            </EditField>
            <EditField wide label="Dirección">
              <textarea className="field mt-1.5 min-h-20 py-2" onChange={field("address")} value={draft.address} />
            </EditField>
          </EditSection>

          <EditSection title="Relación laboral">
            <EditField label="Fecha de ingreso *"><Input className="field mt-1.5" type="date" onChange={field("admissionDate")} value={draft.admissionDate} /></EditField>
            <EditField label="Cargo"><Input className="field mt-1.5" onChange={field("role")} value={draft.role} /></EditField>
            <EditField label="Departamento"><Input className="field mt-1.5" onChange={field("department")} value={draft.department} /></EditField>
            <EditField label="Sucursal">
              <SimpleSelect className="field mt-1.5" onChange={field("branchId")} value={draft.branchId}>
                <option value="">Sin sucursal específica</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </SimpleSelect>
            </EditField>
            <EditField label="Tipo de contrato">
              <SimpleSelect className="field mt-1.5" onChange={field("contractType")} value={draft.contractType}>
                <option>Tiempo indeterminado</option>
                <option>Tiempo determinado</option>
                <option>Por obra determinada</option>
              </SimpleSelect>
            </EditField>
            <EditField label="Horario"><Input className="field mt-1.5" onChange={field("schedule")} value={draft.schedule} /></EditField>
            <EditField label="Estado">
              <SimpleSelect className="field mt-1.5" onChange={field("status")} value={draft.status}>
                {statuses.map((s) => <option key={s} value={s}>{employeeStatusLabel[s]}</option>)}
              </SimpleSelect>
            </EditField>
          </EditSection>

          <EditSection title="Remuneración">
            <EditField label="Salario acordado mensual"><Input className="field mt-1.5" type="number" step="0.01" min="0" onChange={field("salary")} value={draft.salary} /></EditField>
            <EditField label="Divisa">
              <SimpleSelect className="field mt-1.5" onChange={field("salaryCurrency")} value={draft.salaryCurrency}>
                <option>USD</option>
                <option>EUR</option>
              </SimpleSelect>
            </EditField>
            <EditField label="Bono de alimentación mensual"><Input className="field mt-1.5" type="number" step="0.01" min="0" onChange={field("foodBonus")} value={draft.foodBonus} /></EditField>
          </EditSection>
        </div>
        <footer className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!draft.fullName || !draft.identity || !draft.admissionDate || saving}
            onClick={onSave}
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

// ─── Helpers de presentación ──────────────────────────────────────────────

function ProfileCard({ children, icon: Icon, id, text, title }: { children: ReactNode; icon: ComponentType<{ size?: number }>; id: string; text: string; title: string }) {
  return (
    <section className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900" id={id}>
      <header className="flex gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{text}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Details({ items }: { items: [string, string][] }) {
  return <div className="grid gap-4 sm:grid-cols-2">{items.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>;
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6">{value}</p>
    </div>
  );
}
function Summary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </article>
  );
}
function EditSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mt-1 border-b border-stone-100 py-5 first:pt-0 last:border-0 dark:border-stone-800">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
function EditField({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  return <label className={`text-sm font-medium ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>{label}{children}</label>;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function yearsOfService(value: string) {
  const admission = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  let years = today.getUTCFullYear() - admission.getUTCFullYear();
  if (today.getUTCMonth() < admission.getUTCMonth() || (today.getUTCMonth() === admission.getUTCMonth() && today.getUTCDate() < admission.getUTCDate())) years -= 1;
  return Math.max(0, years);
}
