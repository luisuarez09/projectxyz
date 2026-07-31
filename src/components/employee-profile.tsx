"use client";

import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Download,
  FilePlus2,
  FileText,
  Pencil,
  Phone,
  Plus,
  Smartphone,
  Trash2,
  UserMinus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { employeeStatusClass, employeesDemo, type Employee } from "@/lib/employees-demo";

type PaymentMethod = {
  id: number;
  type: "Transferencia bancaria" | "Pago móvil";
  bank: string;
  account?: string;
  phone?: string;
  identity?: string;
};

export function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const source = employeesDemo.find((item) => item.id === employeeId) ?? employeesDemo[0];
  const [employee, setEmployee] = useState(source);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retirementDate, setRetirementDate] = useState("");
  const [retirementReason, setRetirementReason] = useState("");
  const [liquidationReady, setLiquidationReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [contractReady, setContractReady] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 1, type: "Transferencia bancaria", bank: source.bank, account: source.account },
    { id: 2, type: "Pago móvil", bank: source.bank, phone: source.phone, identity: source.identity },
  ]);

  function retire() {
    if (!retirementDate || !retirementReason) return;
    setEmployee((current) => ({ ...current, status: "Retirado" }));
    setLiquidationReady(true);
    setRetireOpen(false);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link className="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-[#14352d]" href="/empleados/directorio">
        <ArrowLeft size={16} /> Volver al directorio
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><UserRound size={25} /></span>
          <div>
            <p className="text-sm text-stone-500">Empresa activa / Empleados / Ficha</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{employee.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${employeeStatusClass[employee.status]}`}>{employee.status}</span>
            </div>
            <p className="mt-2 text-sm text-stone-500">{employee.identity} · {employee.role} · {employee.department}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setNotice("La edición completa se realiza desde el directorio en esta versión.")} variant="outline"><Pencil /> Editar ficha</Button>
          {employee.status !== "Retirado" && <Button className="text-rose-700" onClick={() => setRetireOpen(true)} variant="outline"><UserMinus /> Registrar retiro</Button>}
        </div>
      </header>

      {notice && <p className="mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">{notice}</p>}
      {liquidationReady && <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"><div><b>Liquidación preparada para revisión</b><p className="mt-1 text-sm">Se registró el retiro. Las reglas de cálculo siguen pendientes de definición.</p></div><Link className="inline-flex h-8 items-center justify-center rounded-lg bg-amber-900 px-3 text-sm font-medium text-white" href="/empleados/liquidaciones">Abrir liquidación</Link></div>}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Ingreso" value={formatDate(employee.admissionDate)} detail={`${yearsOfService(employee.admissionDate)} años de antigüedad`} />
        <Summary label="Contrato" value={employee.contractType} detail={employee.branch} />
        <Summary label="Salario acordado" value={`${employee.salary.toLocaleString("es-VE")} ${employee.salaryCurrency}`} detail="Referencia mensual" />
        <Summary label="Bono alimentación" value={`${employee.foodBonus.toLocaleString("es-VE")} USD`} detail="Monto mensual individual" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden h-fit rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:block">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Ficha del trabajador</p>
          {[["personal", "Datos personales"], ["laboral", "Relación laboral"], ["remuneracion", "Remuneración"], ["banco", "Medios de pago"], ["contrato", "Contrato"]].map(([id, label]) => <a className="block rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-[#14352d] dark:text-stone-300 dark:hover:bg-stone-800" href={`#${id}`} key={id}>{label}</a>)}
        </aside>

        <div className="min-w-0 space-y-5">
          <ProfileCard icon={UserRound} id="personal" title="Datos personales" text="Identificación y contacto del trabajador.">
            <Details items={[["Cédula", employee.identity], ["Teléfono", employee.phone], ["Nacimiento", formatDate(employee.birthDate)], ["Género", employee.gender], ["Dirección", employee.address]]} />
          </ProfileCard>

          <ProfileCard icon={BriefcaseBusiness} id="laboral" title="Relación laboral" text="Condiciones vigentes dentro de la empresa.">
            <Details items={[["Cargo", employee.role], ["Departamento", employee.department], ["Sucursal", employee.branch], ["Tipo de contrato", employee.contractType], ["Horario", employee.schedule], ["Fecha de ingreso", formatDate(employee.admissionDate)]]} />
          </ProfileCard>

          <ProfileCard icon={Banknote} id="remuneracion" title="Remuneración de referencia" text="El pago y los recibos se expresan siempre en bolívares.">
            <div className="grid gap-4 sm:grid-cols-2"><Detail label="Salario mensual acordado" value={`${employee.salary.toLocaleString("es-VE")} ${employee.salaryCurrency}`} /><Detail label="Bono de alimentación mensual" value={`${employee.foodBonus.toLocaleString("es-VE")} USD`} /><Detail label="Fuente de conversión" value="Configuración laboral de la empresa" /><Detail label="Salario mínimo" value="Referencia general pendiente de cargar" /></div>
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-500 dark:bg-stone-800">La tasa aplicada se fija y conserva al crear cada nómina; no modifica el salario acordado del trabajador.</p>
          </ProfileCard>

          <ProfileCard icon={CreditCard} id="banco" title="Medios de pago" text="Se pueden registrar varias cuentas bancarias y datos de pago móvil.">
            <div className="space-y-3">
              {paymentMethods.map((method) => <PaymentMethodCard key={method.id} method={method} onDelete={() => setPaymentMethods((current) => current.filter((item) => item.id !== method.id))} />)}
              {paymentMethods.length === 0 && <p className="rounded-lg border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500 dark:border-stone-700">No hay medios de pago registrados.</p>}
            </div>
            <Button className="mt-4" onClick={() => setPaymentOpen(true)} variant="outline"><Plus /> Agregar medio de pago</Button>
          </ProfileCard>

          <ProfileCard icon={FileText} id="contrato" title="Contrato de trabajo" text="Genera el documento general con los datos vigentes de la ficha y luego descárgalo.">
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><FileText className="mt-0.5 text-[#14352d] dark:text-emerald-300" size={20} /><div><b className="text-sm">Contrato general de trabajo</b><p className="mt-1 text-xs text-stone-500">{contractReady ? "Generado con la información actual del trabajador." : "Aún no ha sido generado."}</p></div></div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setContractReady(true)} size="sm" variant="outline"><FilePlus2 /> {contractReady ? "Regenerar" : "Generar contrato"}</Button>
                <Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!contractReady} onClick={() => downloadContract(employee)} size="sm"><Download /> Descargar</Button>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-stone-500">El documento generado es un borrador general y deberá revisarse antes de la firma.</p>
          </ProfileCard>
        </div>
      </div>

      {paymentOpen && <PaymentMethodDialog employee={employee} onClose={() => setPaymentOpen(false)} onSave={(method) => { setPaymentMethods((current) => [...current, { ...method, id: Date.now() }]); setPaymentOpen(false); }} />}
      {retireOpen && <RetirementDialog date={retirementDate} onClose={() => setRetireOpen(false)} onConfirm={retire} onDate={setRetirementDate} onReason={setRetirementReason} reason={retirementReason} />}
    </main>
  );
}

function PaymentMethodCard({ method, onDelete }: { method: PaymentMethod; onDelete: () => void }) {
  const Icon = method.type === "Pago móvil" ? Smartphone : CreditCard;
  return <div className="flex items-start gap-3 rounded-lg border border-stone-200 p-4 dark:border-stone-700"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><Icon size={17} /></span><div className="min-w-0 flex-1"><b className="text-sm">{method.type}</b><p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{method.bank}</p><p className="mt-0.5 text-xs text-stone-500">{method.type === "Pago móvil" ? `${method.phone} · ${method.identity}` : method.account}</p></div><Button aria-label={`Eliminar ${method.type}`} className="text-rose-600" onClick={onDelete} size="icon-sm" variant="ghost"><Trash2 /></Button></div>;
}

function PaymentMethodDialog({ employee, onClose, onSave }: { employee: Employee; onClose: () => void; onSave: (method: Omit<PaymentMethod, "id">) => void }) {
  const [type, setType] = useState<PaymentMethod["type"]>("Transferencia bancaria");
  const [bank, setBank] = useState(employee.bank);
  const [account, setAccount] = useState("");
  const method = type === "Pago móvil" ? { type, bank, phone: employee.phone, identity: employee.identity } : { type, bank, account };
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="dialog"><section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-stone-900"><header className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800"><div><h2 className="text-lg font-semibold">Agregar medio de pago</h2><p className="mt-1 text-sm text-stone-500">Transferencia bancaria o pago móvil.</p></div><Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button></header><div className="space-y-4 p-5"><label className="block text-sm font-medium">Tipo<SimpleSelect className="field mt-1.5" onChange={(event) => setType(event.target.value as PaymentMethod["type"])} value={type}><option>Transferencia bancaria</option><option>Pago móvil</option></SimpleSelect></label><label className="block text-sm font-medium">Banco<Input className="field mt-1.5" onChange={(event) => setBank(event.target.value)} value={bank} /></label>{type === "Transferencia bancaria" ? <label className="block text-sm font-medium">Número de cuenta<Input className="field mt-1.5" onChange={(event) => setAccount(event.target.value)} placeholder="20 dígitos" value={account} /></label> : <div className="grid gap-3 rounded-lg bg-stone-50 p-4 dark:bg-stone-800 sm:grid-cols-2"><Detail label="Teléfono" value={employee.phone} /><Detail label="Cédula" value={employee.identity} /><p className="text-xs text-stone-500 sm:col-span-2">Pago móvil utiliza automáticamente el teléfono y la cédula registrados en los datos personales.</p></div>}</div><footer className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!bank || (type === "Transferencia bancaria" && !account)} onClick={() => onSave(method)}>Agregar</Button></footer></section></div>;
}

function RetirementDialog({ date, reason, onDate, onReason, onClose, onConfirm }: { date: string; reason: string; onDate: (value: string) => void; onReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4" role="dialog"><section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-stone-900"><header className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800"><div><h2 className="text-lg font-semibold">Registrar retiro</h2><p className="mt-1 text-sm text-stone-500">El trabajador pasará a retirado y se preparará su liquidación.</p></div><Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button></header><div className="space-y-4 p-5"><label className="block text-sm font-medium">Fecha de retiro<Input className="field mt-1.5" onChange={(event) => onDate(event.target.value)} type="date" value={date} /></label><label className="block text-sm font-medium">Motivo<SimpleSelect className="field mt-1.5" onChange={(event) => onReason(event.target.value)} value={reason}><option value="">Seleccionar</option><option>Renuncia</option><option>Finalización de contrato</option><option>Despido</option><option>Mutuo acuerdo</option><option>Otro</option></SimpleSelect></label><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">La liquidación quedará en preparación, sin montos definitivos, hasta configurar sus reglas de cálculo.</p></div><footer className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800"><Button onClick={onClose} variant="outline">Cancelar</Button><Button className="bg-rose-700 text-white hover:bg-rose-800" disabled={!date || !reason} onClick={onConfirm}>Confirmar retiro</Button></footer></section></div>;
}

function ProfileCard({ children, icon: Icon, id, text, title }: { children: ReactNode; icon: ComponentType<{ size?: number }>; id: string; text: string; title: string }) { return <section className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900" id={id}><header className="flex gap-3 border-b border-stone-100 p-5 dark:border-stone-800"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Icon size={18} /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-stone-500">{text}</p></div></header><div className="p-5">{children}</div></section>; }
function Details({ items }: { items: string[][] }) { return <div className="grid gap-4 sm:grid-cols-2">{items.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-1 text-sm font-medium leading-6">{value}</p></div>; }
function Summary({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></article>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function yearsOfService(value: string) { const admission = new Date(`${value}T00:00:00Z`); const today = new Date("2026-07-31T00:00:00Z"); let years = today.getUTCFullYear() - admission.getUTCFullYear(); if (today.getUTCMonth() < admission.getUTCMonth() || (today.getUTCMonth() === admission.getUTCMonth() && today.getUTCDate() < admission.getUTCDate())) years -= 1; return Math.max(0, years); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function downloadContract(employee: Employee) { const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;margin:48px;color:#222}h1{text-align:center;font-size:20px}p{text-align:justify}.signatures{display:flex;justify-content:space-between;margin-top:80px}.signatures div{width:42%;border-top:1px solid #222;text-align:center;padding-top:8px}.note{margin-top:40px;font-size:11px;color:#666}</style></head><body><h1>CONTRATO GENERAL DE TRABAJO</h1><p>Entre <b>Distribuidora El Roble, C.A.</b>, en adelante LA EMPRESA, y <b>${escapeHtml(employee.name)}</b>, titular de la cédula de identidad <b>${escapeHtml(employee.identity)}</b>, en adelante EL TRABAJADOR, se acuerda formalizar la relación de trabajo para desempeñar el cargo de <b>${escapeHtml(employee.role)}</b> en el departamento de <b>${escapeHtml(employee.department)}</b>.</p><p>La relación inicia el ${escapeHtml(formatDate(employee.admissionDate))}, bajo la modalidad ${escapeHtml(employee.contractType.toLowerCase())}, con el horario ${escapeHtml(employee.schedule)}. La remuneración, beneficios, obligaciones y demás condiciones deberán completarse y validarse conforme a la configuración vigente de la empresa y la normativa aplicable.</p><p>Ambas partes declaran haber leído el contenido y firman en señal de conformidad.</p><div class="signatures"><div>LA EMPRESA</div><div>EL TRABAJADOR</div></div><p class="note">Borrador general generado por proyectoxyz. Debe ser revisado antes de su firma y no sustituye asesoría legal.</p></body></html>`; const blob = new Blob([html], { type: "application/msword;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `contrato-${employee.id}.doc`; link.click(); URL.revokeObjectURL(url); }
