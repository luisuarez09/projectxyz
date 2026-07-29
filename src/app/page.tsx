import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileText,
  Landmark,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  UsersRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextSelector } from "@/components/context-selector";
import { NotificationMenu } from "@/components/notification-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const navItems = [
  { label: "Resumen", icon: Landmark, active: true },
  { label: "Empresas", icon: Building2 },
  { label: "Calendario", icon: CalendarDays },
  { label: "Operaciones", icon: ReceiptText },
  { label: "Documentos", icon: FileText },
  { label: "Equipo", icon: UsersRound },
];

const tasks = [
  { company: "Distribuidora El Roble, C.A.", task: "Retención de IVA · Junio 2026", date: "Hoy, 4:00 p. m.", status: "Prioridad", tone: "danger" },
  { company: "Inversiones Costa Azul, C.A.", task: "Declaración IVA · Junio 2026", date: "30 jul · 2 días", status: "En revisión", tone: "review" },
  { company: "Servicios Maracay, C.A.", task: "Libro de compras · Junio 2026", date: "31 jul · 3 días", status: "Pendiente", tone: "neutral" },
];

const deadlines = [
  { day: "29", month: "JUL", label: "Retenciones de IVA", count: "3 empresas", color: "bg-rose-500" },
  { day: "30", month: "JUL", label: "Declaración de IVA", count: "5 empresas", color: "bg-amber-500" },
  { day: "01", month: "AGO", label: "Retenciones ISLR", count: "2 empresas", color: "bg-emerald-500" },
];

const statusClass: Record<string, string> = {
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  review: "border-amber-200 bg-amber-50 text-amber-700",
  neutral: "border-stone-200 bg-stone-100 text-stone-600",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-stone-200 bg-white px-4 py-5 dark:border-stone-800 dark:bg-stone-900 lg:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white">PX</div>
          <div>
            <p className="font-semibold tracking-tight">proyectoxyz</p>
            <p className="text-xs text-stone-500">Firma contable</p>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Navegación principal">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-[#e7f0e9] font-medium text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`}
              key={label}
              type="button"
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-[#14352d] p-4 text-white">
          <p className="text-xs font-medium text-emerald-100">PLAN PROFESIONAL</p>
          <p className="mt-2 text-sm leading-5 text-emerald-50">Controla los vencimientos antes de que se conviertan en urgencias.</p>
          <button className="mt-4 text-xs font-semibold text-white underline underline-offset-4" type="button">Ver cobertura del plan</button>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-stone-200 bg-[#f7f7f4]/90 px-5 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 lg:px-10">
          <div className="flex items-center gap-3">
            <details className="group relative lg:hidden">
              <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-stone-600 hover:bg-stone-200 [&::-webkit-details-marker]:hidden" aria-label="Abrir menú de navegación">
                <Menu size={21} />
              </summary>
              <div className="absolute left-0 top-12 z-30 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
                <div className="mb-3 flex items-center gap-3 border-b border-stone-100 px-2 pb-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#14352d] text-xs font-bold text-white">PX</div>
                  <div><p className="text-sm font-semibold">proyectoxyz</p><p className="text-xs text-stone-500">Firma contable</p></div>
                </div>
                <nav className="space-y-1" aria-label="Navegación móvil">
                  {navItems.map(({ label, icon: Icon, active }) => (
                    <button className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${active ? "bg-[#e7f0e9] font-medium text-[#14352d]" : "text-stone-600 hover:bg-stone-100"}`} key={label} type="button">
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </nav>
              </div>
            </details>
            <div className="grid size-9 place-items-center rounded-xl bg-[#14352d] text-sm font-bold text-white lg:hidden">PX</div>
            <ContextSelector />
            <div className="hidden items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-400 dark:border-stone-700 dark:bg-stone-900 xl:flex">
              <Search size={16} />
              <span>Buscar empresa, cliente o tarea...</span>
              <kbd className="ml-16 rounded border border-stone-200 px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationMenu />
            <ThemeToggle />
            <div className="h-7 w-px bg-stone-200" />
            <UserMenu />
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm text-stone-500">Miércoles, 29 de julio de 2026</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Buenos días, Luis</h1>
              <p className="mt-2 text-sm text-stone-600">Esta es la vista de la firma. Los datos son demostrativos.</p>
            </div>
            <Button className="bg-[#14352d] px-4 hover:bg-[#0e2821]"><Plus /> Registrar operación</Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Obligaciones de hoy" value="3" note="1 requiere atención" icon={CircleAlert} tint="rose" />
            <Metric label="Próximos 7 días" value="12" note="En 8 empresas" icon={CalendarDays} tint="amber" />
            <Metric label="Listas para revisar" value="6" note="Asignadas al equipo" icon={ClipboardList} tint="blue" />
            <Metric label="Cumplimiento del mes" value="94%" note="+4% vs. mes anterior" icon={CheckCircle2} tint="green" />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle>Requiere atención</CardTitle>
                  <CardDescription className="mt-1">Tareas tributarias próximas o retrasadas</CardDescription>
                </div>
                <Button variant="ghost" size="sm">Ver todas <ChevronRight /></Button>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="divide-y divide-stone-100">
                  {tasks.map((task) => (
                    <div className="flex flex-col gap-3 py-4 first:pt-1 sm:flex-row sm:items-center sm:justify-between" key={task.company}>
                      <div className="flex min-w-0 gap-3">
                      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300"><Building2 size={17} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{task.company}</p>
                          <p className="mt-0.5 text-sm text-stone-500">{task.task}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-12 sm:pl-0">
                        <div className="text-right text-xs text-stone-500"><p>{task.date}</p><p className="mt-1 text-stone-400">Asignado a ti</p></div>
                        <Badge variant="outline" className={statusClass[task.tone]}>{task.status}</Badge>
                        <button className="text-stone-400 hover:text-stone-700" type="button" aria-label="Más opciones"><MoreHorizontal size={19} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Próximos vencimientos</CardTitle>
                <CardDescription className="mt-1">Calendario fiscal de la firma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deadlines.map((deadline) => (
                    <div className="flex items-center gap-3" key={deadline.label}>
                      <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-stone-200 bg-stone-50 text-center leading-none text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
                        <strong className="text-sm">{deadline.day}</strong><span className="mt-0.5 text-[9px] font-medium text-stone-500 dark:text-stone-400">{deadline.month}</span>
                      </div>
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{deadline.label}</p><p className="mt-0.5 text-xs text-stone-500">{deadline.count}</p></div>
                      <span className={`size-2 rounded-full ${deadline.color}`} aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <button className="mt-6 flex w-full items-center justify-center gap-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800" type="button">Abrir calendario <ArrowUpRight size={15} /></button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-0 shadow-sm">
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Empresas activas</CardTitle><CardDescription className="mt-1">Resumen operativo del mes en curso</CardDescription></div>
              <Button variant="outline" size="sm">Ver empresas</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-160 text-left text-sm">
                <thead className="border-y border-stone-100 text-xs font-medium text-stone-500"><tr><th className="py-3 pr-4">Empresa</th><th className="py-3 pr-4">Plan</th><th className="py-3 pr-4">Próxima obligación</th><th className="py-3 pr-4">Responsable</th><th className="py-3 text-right">Estado</th></tr></thead>
                <tbody>
                  <CompanyRow name="Distribuidora El Roble, C.A." plan="Integral" due="Retención IVA · Hoy" owner="LU" status="Atención" tone="danger" />
                  <CompanyRow name="Inversiones Costa Azul, C.A." plan="Integral" due="IVA · 30 jul" owner="MA" status="En revisión" tone="review" />
                  <CompanyRow name="Servicios Maracay, C.A." plan="Esencial" due="Libro compras · 31 jul" owner="JP" status="Al día" tone="good" />
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, note, icon: Icon, tint }: { label: string; value: string; note: string; icon: typeof CalendarDays; tint: "rose" | "amber" | "blue" | "green" }) {
  const colors = { rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300", blue: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300", green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" };
  return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{note}</p></div><div className={`grid size-9 place-items-center rounded-lg ${colors[tint]}`}><Icon size={18} /></div></CardContent></Card>;
}

function CompanyRow({ name, plan, due, owner, status, tone }: { name: string; plan: string; due: string; owner: string; status: string; tone: "danger" | "review" | "good" }) {
  const color = { danger: "border-rose-200 bg-rose-50 text-rose-700", review: "border-amber-200 bg-amber-50 text-amber-700", good: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  return <tr className="border-b border-stone-100 last:border-0 dark:border-stone-800"><td className="py-4 pr-4 font-medium">{name}</td><td className="py-4 pr-4 text-stone-600 dark:text-stone-300">{plan}</td><td className="py-4 pr-4 text-stone-600 dark:text-stone-300">{due}</td><td className="py-4 pr-4"><Avatar className="size-7"><AvatarFallback className="bg-stone-100 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">{owner}</AvatarFallback></Avatar></td><td className="py-4 text-right"><Badge variant="outline" className={color[tone]}>{status}</Badge></td></tr>;
}
