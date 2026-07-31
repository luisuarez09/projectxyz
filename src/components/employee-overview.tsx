import { AlertCircle, ArrowRight, CalendarClock, CircleDollarSign, FileCheck2, Settings2, UsersRound } from "lucide-react";
import Link from "next/link";

import { employeesDemo, money } from "@/lib/employees-demo";

const actions = [
  { title: "Preparar nómina", detail: "2.ª quincena de julio · tasa pendiente de confirmar", href: "/empleados/nomina", icon: CircleDollarSign, tone: "amber" },
  { title: "Revisar vacaciones", detail: "2 trabajadores cumplen aniversario en los próximos 30 días", href: "/empleados/vacaciones", icon: CalendarClock, tone: "sky" },
  { title: "Completar configuración", detail: "Cargar salario mínimo, fuentes y vigencias laborales", href: "/configuracion/empresa/laboral", icon: Settings2, tone: "stone" },
] as const;

export function EmployeeOverview() {
  const active = employeesDemo.filter((employee) => employee.status !== "Retirado").length;
  const estimatedMonthlyPayroll = employeesDemo.filter((employee) => employee.status !== "Retirado" && employee.status !== "Suspendido").reduce((total, employee) => total + employee.salary + employee.foodBonus, 0) * 47.5;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Empleados</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Personal y nómina</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Expedientes, pagos y beneficios laborales de Distribuidora El Roble, C.A.</p>
        </div>
        <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" href="/empleados/directorio"><UsersRound size={16} /> Registrar empleado</Link>
      </header>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Trabajadores activos" value={String(active)} detail="1 de vacaciones · 1 en reposo" />
        <Metric label="Próxima nómina" value="31 jul" detail="Quincenal · borrador" />
        <Metric label="Vacaciones por atender" value="2" detail="Dentro de los próximos 30 días" />
        <Metric label="Nómina mensual estimada" value={money(estimatedMonthlyPayroll)} detail="Salario + alimentación · sin aportes patronales" />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Atención requerida</h2><p className="mt-1 text-sm text-stone-500">Decisiones pendientes antes de cerrar el período.</p></div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {actions.map(({ title, detail, href, icon: Icon, tone }) => <Link className="group flex items-center gap-4 p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50" href={href} key={title}><span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-950" : tone === "sky" ? "bg-sky-50 text-sky-700 dark:bg-sky-950" : "bg-stone-100 text-stone-600 dark:bg-stone-800"}`}><Icon size={19} /></span><span className="min-w-0 flex-1"><b className="text-sm">{title}</b><span className="mt-1 block text-sm text-stone-500">{detail}</span></span><ArrowRight className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#14352d]" size={17} /></Link>)}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={18} /> Reglas por completar</div><p className="mt-2 text-sm leading-6">Los cálculos son demostrativos hasta cargar fuentes, vigencias y bases por concepto.</p><Link className="mt-4 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4" href="/configuracion/empresa/laboral">Abrir configuración <ArrowRight size={14} /></Link></section>
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className="flex items-center gap-2"><FileCheck2 className="text-[#14352d] dark:text-emerald-300" size={18} /><h2 className="font-semibold">Trazabilidad</h2></div><p className="mt-2 text-sm leading-6 text-stone-500">Cada nómina conservará período, tasa aplicada, conceptos, revisión, aprobación y soportes.</p></section>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></article>;
}
