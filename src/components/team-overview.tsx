"use client";;
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  ListChecks,
  Plus,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type Member = {
  id: number;
  initials: string;
  name: string;
  role: string;
  companies: number;
  assigned: number;
  completed: number;
  onTime: number;
  firstPass: number;
  score: number;
  overdue: number;
  review: number;
  load: "Equilibrada" | "Alta" | "Disponible";
};

const members: Member[] = [
  { id: 1, initials: "MP", name: "María Pérez", role: "Contadora senior", companies: 8, assigned: 22, completed: 19, onTime: 96, firstPass: 94, score: 95, overdue: 0, review: 3, load: "Alta" },
  { id: 2, initials: "JT", name: "José Torres", role: "Analista tributario", companies: 6, assigned: 18, completed: 15, onTime: 93, firstPass: 91, score: 92, overdue: 1, review: 2, load: "Equilibrada" },
  { id: 3, initials: "AC", name: "Andrea Castillo", role: "Asistente contable", companies: 5, assigned: 15, completed: 11, onTime: 87, firstPass: 89, score: 87, overdue: 2, review: 1, load: "Equilibrada" },
  { id: 4, initials: "CR", name: "Carlos Rojas", role: "Contador", companies: 4, assigned: 9, completed: 8, onTime: 100, firstPass: 96, score: 97, overdue: 0, review: 1, load: "Disponible" },
];

const attention = [
  { company: "Constructora Ferresum, C.A.", task: "Declaración de IVA · Junio", owner: "Andrea Castillo", due: "Vencida hace 2 días", tone: "danger" },
  { company: "Proyecto Trébol, C.A.", task: "Retención ISLR · Junio", owner: "José Torres", due: "Vence hoy · 4:00 p. m.", tone: "warning" },
  { company: "Inversiones Costa Azul, C.A.", task: "Declaración de IVA · Junio", owner: "María Pérez", due: "Lista para revisión", tone: "review" },
];

const workloadChartConfig = {
  preparation: {
    label: "En preparación",
    color: "#0ea5e9",
  },
  review: {
    label: "En revisión",
    color: "#f59e0b",
  },
  overdue: {
    label: "Vencidas",
    color: "#e11d48",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  onTime: {
    label: "A tiempo",
    color: "#2f715f",
  },
  firstPass: {
    label: "Sin retrabajo",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;

const qualityChartConfig = {
  onTime: {
    label: "Puntualidad",
    color: "#2f715f",
  },
  firstPass: {
    label: "Calidad inicial",
    color: "#38bdf8",
  },
} satisfies ChartConfig;

const trendMonths = ["Feb", "Mar", "Abr", "May", "Jun", "Jul"];

function buildTrend(onTime: number, firstPass: number) {
  const onTimeOffsets = [-5, -4, -3, -2, -1, 0];
  const qualityOffsets = [-4, -3, -3, -2, -1, 0];
  return trendMonths.map((month, index) => ({
    month,
    onTime: Math.max(0, Math.min(100, onTime + onTimeOffsets[index])),
    firstPass: Math.max(0, Math.min(100, firstPass + qualityOffsets[index])),
  }));
}

const scoreTone = (score: number) => score >= 93
  ? "text-emerald-700 dark:text-emerald-300"
  : score >= 88
    ? "text-amber-700 dark:text-amber-300"
    : "text-rose-700 dark:text-rose-300";

export function TeamOverview() {
  const [period, setPeriod] = useState("Julio 2026");
  const [loadFilter, setLoadFilter] = useState("Todas las cargas");
  const [trendScope, setTrendScope] = useState("team");
  const [selected, setSelected] = useState<Member | null>(null);
  const [notice, setNotice] = useState("");
  const visibleMembers = useMemo(
    () => members.filter((member) => loadFilter === "Todas las cargas" || member.load === loadFilter),
    [loadFilter],
  );
  const workloadData = useMemo(
    () =>
      visibleMembers.map((member) => ({
        responsible: member.name.split(" ")[0],
        preparation: Math.max(0, member.assigned - member.completed - member.review - member.overdue),
        review: member.review,
        overdue: member.overdue,
      })),
    [visibleMembers],
  );
  const qualityData = useMemo(
    () =>
      visibleMembers.map((member) => ({
        responsible: member.name.split(" ")[0],
        onTime: member.onTime,
        firstPass: member.firstPass,
      })),
    [visibleMembers],
  );
  const trendData = useMemo(() => {
    if (trendScope === "team") return buildTrend(93, 92);
    const member = members.find((item) => String(item.id) === trendScope);
    return buildTrend(member?.onTime ?? 93, member?.firstPass ?? 92);
  }, [trendScope]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      {notice && <div className="fixed right-4 top-22 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-xl dark:border-emerald-900 dark:bg-stone-900 dark:text-stone-200">{notice}</div>}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-stone-500">Gestión de la firma</p>
            <Badge className="border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300" variant="outline">Datos demostrativos</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Equipo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Supervisa el cumplimiento de asignaciones, detecta riesgos y equilibra la responsabilidad sobre las empresas.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800" href="/equipo/cuentas">
            <UsersRound size={16} /> Administrar cuentas
          </Link>
          <Button className="bg-[#14352d] hover:bg-[#0e2821]" onClick={() => showNotice("La asignación se conectará al flujo real de declaraciones.")}>
            <Plus size={16} /> Asignar declaración
          </Button>
        </div>
      </div>
      <nav className="mt-7 flex gap-6 border-b border-stone-200 text-sm dark:border-stone-800" aria-label="Secciones de equipo">
        <Link className="border-b-2 border-[#14352d] px-1 pb-3 font-medium text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" href="/equipo">Supervisión</Link>
        <Link className="px-1 pb-3 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100" href="/equipo/cuentas">Cuentas y accesos</Link>
      </nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={Target} label="Cumplimiento del equipo" value="93%" detail="60 de 64 asignaciones a tiempo" tone="emerald" />
        <Summary icon={ListChecks} label="Completadas este mes" value="53" detail="De 64 asignaciones del período" tone="blue" />
        <Summary icon={Clock3} label="Listas para revisar" value="7" detail="Requieren validación del supervisor" tone="amber" />
        <Summary icon={AlertTriangle} label="Fuera de plazo" value="3" detail="En 2 empresas · requieren acción" tone="rose" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Carga abierta por responsable</CardTitle>
              <CardDescription className="mt-1">
                Asignaciones que todavía requieren trabajo o revisión
              </CardDescription>
            </div>
            <Badge className="w-fit border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300" variant="outline">
              {workloadData.reduce((total, item) => total + item.preparation + item.review + item.overdue, 0)} abiertas
            </Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={workloadChartConfig}
              initialDimension={{ width: 560, height: 280 }}
            >
              <BarChart
                accessibilityLayer
                data={workloadData}
                layout="vertical"
                margin={{ left: 0, right: 12, top: 6, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis allowDecimals={false} axisLine={false} tickLine={false} type="number" />
                <YAxis axisLine={false} dataKey="responsible" tickLine={false} type="category" width={62} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="preparation" fill="var(--color-preparation)" radius={[4, 0, 0, 4]} stackId="open" />
                <Bar dataKey="review" fill="var(--color-review)" stackId="open" />
                <Bar dataKey="overdue" fill="var(--color-overdue)" radius={[0, 4, 4, 0]} stackId="open" />
              </BarChart>
            </ChartContainer>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              La carga se actualiza con el filtro de responsables. Las vencidas se mantienen separadas para no quedar ocultas dentro del total.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Evolución del cumplimiento</CardTitle>
              <CardDescription className="mt-1">
                Puntualidad y aprobaciones sin retrabajo · últimos seis meses
              </CardDescription>
            </div>
            <label className="sr-only" htmlFor="trend-scope">Responsable</label>
            <SimpleSelect
              className="field w-auto min-w-44"
              id="trend-scope"
              onChange={(event) => setTrendScope(event.target.value)}
              value={trendScope}
            >
              <option value="team">Todo el equipo</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </SimpleSelect>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[280px] w-full"
              config={trendChartConfig}
              initialDimension={{ width: 560, height: 280 }}
            >
              <LineChart
                accessibilityLayer
                data={trendData}
                margin={{ left: 0, right: 12, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis axisLine={false} dataKey="month" tickLine={false} tickMargin={8} />
                <YAxis
                  axisLine={false}
                  domain={[80, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="onTime"
                  dot={{ fill: "var(--color-onTime)", r: 3 }}
                  stroke="var(--color-onTime)"
                  strokeWidth={2.5}
                  type="monotone"
                />
                <Line
                  dataKey="firstPass"
                  dot={{ fill: "var(--color-firstPass)", r: 3 }}
                  stroke="var(--color-firstPass)"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ChartContainer>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              Cambia entre la vista consolidada y una persona para detectar tendencias sin convertir el panel en un ranking.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.78fr]">
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="gap-4 border-b border-stone-100 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Rendimiento por responsable</CardTitle>
              <CardDescription className="mt-1">Resultados del período según asignaciones registradas</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="team-period">Período</label>
              <SimpleSelect className="field w-auto min-w-36" id="team-period" onChange={(event) => setPeriod(event.target.value)} value={period}>
                <option>Julio 2026</option>
                <option>Junio 2026</option>
                <option>2do trimestre 2026</option>
              </SimpleSelect>
              <label className="sr-only" htmlFor="load-filter">Carga</label>
              <SimpleSelect className="field w-auto min-w-42" id="load-filter" onChange={(event) => setLoadFilter(event.target.value)} value={loadFilter}>
                <option>Todas las cargas</option>
                <option>Alta</option>
                <option>Equilibrada</option>
                <option>Disponible</option>
              </SimpleSelect>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[850px] text-left text-sm">
              <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-800/60">
                <TableRow>
                  <TableHead className="px-5 py-3">Responsable</TableHead>
                  <TableHead className="px-4 py-3">Empresas</TableHead>
                  <TableHead className="px-4 py-3">Avance</TableHead>
                  <TableHead className="px-4 py-3">A tiempo</TableHead>
                  <TableHead className="px-4 py-3">Puntaje</TableHead>
                  <TableHead className="px-4 py-3">Carga</TableHead>
                  <TableHead className="px-5 py-3 text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
                {visibleMembers.map((member) => (
                  <TableRow className="transition hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={member.id}>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9"><AvatarFallback className="bg-[#e7f0e9] text-xs font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">{member.initials}</AvatarFallback></Avatar>
                        <div><p className="font-semibold">{member.name}</p><p className="mt-0.5 text-xs text-stone-500">{member.role}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 font-medium">{member.companies}</TableCell>
                    <TableCell className="px-4 py-4">
                      <p className="font-medium">{member.completed} <span className="font-normal text-stone-400">/ {member.assigned}</span></p>
                      <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><div className="h-full rounded-full bg-[#2f715f]" style={{ width: `${Math.round((member.completed / member.assigned) * 100)}%` }} /></div>
                    </TableCell>
                    <TableCell className="px-4 py-4">{member.onTime}%</TableCell>
                    <TableCell className={`px-4 py-4 text-base font-semibold ${scoreTone(member.score)}`}>{member.score}<span className="text-xs font-normal text-stone-400">/100</span></TableCell>
                    <TableCell className="px-4 py-4"><LoadBadge load={member.load} /></TableCell>
                    <TableCell className="px-5 py-4 text-right"><button className="inline-grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-[#14352d] dark:hover:bg-stone-800" onClick={() => setSelected(member)} type="button" aria-label={`Ver rendimiento de ${member.name}`}><Eye size={17} /></button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 border-t border-stone-100 bg-stone-50/50 px-5 py-3 text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-800/30 sm:flex-row sm:items-center sm:justify-between">
            <span>{visibleMembers.length} responsables · {period}</span>
            <span className="inline-flex items-center gap-1"><CircleHelp size={14} /> El puntaje no reemplaza la evaluación profesional.</span>
          </div>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle>Requiere atención</CardTitle><CardDescription className="mt-1">Excepciones priorizadas por fecha</CardDescription></div>
              <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300"><AlertTriangle size={17} /></span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {attention.map((item) => (
              <button className="w-full rounded-xl px-2 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800/70" key={item.company} onClick={() => showNotice(`Abriendo el expediente de ${item.company}.`)} type="button">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 size-2 shrink-0 rounded-full ${item.tone === "danger" ? "bg-rose-500" : item.tone === "warning" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.company}</p>
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">{item.task}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-stone-500">{item.owner}</span><span className={item.tone === "danger" ? "font-medium text-rose-600" : "text-stone-500"}>{item.due}</span></div>
                  </div>
                  <ChevronRight className="mt-0.5 shrink-0 text-stone-300" size={17} />
                </div>
              </button>
            ))}
            <Link className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800" href="/calendario">Ver todas las asignaciones <ArrowRight size={15} /></Link>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Puntualidad y calidad inicial</CardTitle>
            <CardDescription>
              Porcentaje completado a tiempo y aprobado sin devolución
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="h-[290px] w-full"
              config={qualityChartConfig}
              initialDimension={{ width: 620, height: 290 }}
            >
              <BarChart
                accessibilityLayer
                data={qualityData}
                margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis axisLine={false} dataKey="responsible" tickLine={false} tickMargin={8} />
                <YAxis
                  axisLine={false}
                  domain={[80, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="onTime" fill="var(--color-onTime)" radius={[5, 5, 0, 0]} />
                <Bar dataKey="firstPass" fill="var(--color-firstPass)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              La comparación usa porcentajes para no favorecer automáticamente a quien tenga más empresas o asignaciones.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-[#14352d] text-white shadow-sm">
          <CardHeader><div className="flex items-center gap-2 text-emerald-100"><Briefcase size={17} /><span className="text-xs font-semibold uppercase tracking-[0.12em]">Criterio transparente</span></div><CardTitle className="mt-2 text-white">Cómo se calcula el puntaje</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-emerald-50">
            <ScoreFactor label="Puntualidad" value="50%" note="Asignaciones cerradas dentro del plazo" />
            <ScoreFactor label="Calidad" value="30%" note="Aprobadas sin devolución o retrabajo" />
            <ScoreFactor label="Cumplimiento" value="20%" note="Avance de lo asignado en el período" />
            <p className="border-t border-white/15 pt-3 text-xs leading-5 text-emerald-100">Los permisos, vacaciones, cambios de alcance e incidencias justificadas deben excluirse o documentarse antes de evaluar a una persona.</p>
          </CardContent>
        </Card>
      </div>
      {selected && <MemberDetail member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Summary({ icon: Icon, label, value, detail, tone }: { icon: typeof Target; label: string; value: string; detail: string; tone: "emerald" | "blue" | "amber" | "rose" }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300", blue: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300", amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300", rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300" };
  return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><div className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><Icon size={18} /></div></CardContent></Card>;
}

function LoadBadge({ load }: { load: Member["load"] }) {
  const styles = { Alta: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300", Equilibrada: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300", Disponible: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300" };
  return <Badge className={styles[load]} variant="outline">{load}</Badge>;
}

function ScoreFactor({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-lg bg-white/8 p-3"><div><p className="font-medium text-white">{label}</p><p className="mt-0.5 text-xs text-emerald-100">{note}</p></div><span className="font-semibold text-white">{value}</span></div>;
}

function MemberDetail({ member, onClose }: { member: Member; onClose: () => void }) {
  const assignments = [
    { name: "Declaración IVA · Junio", company: "Inversiones Costa Azul, C.A.", state: "En revisión" },
    { name: "Retención ISLR · Junio", company: "Nueva Confitería del Sur, C.A.", state: "Completada" },
    { name: "Libro de compras · Julio", company: "Servicios Maracay, C.A.", state: "En preparación" },
  ];
  return <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/40" role="dialog" aria-modal="true" aria-label={`Rendimiento de ${member.name}`}><button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label="Cerrar detalle" /><aside className="relative h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-stone-900"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><Avatar className="size-11"><AvatarFallback className="bg-[#e7f0e9] font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">{member.initials}</AvatarFallback></Avatar><div><h2 className="text-lg font-semibold">{member.name}</h2><p className="text-sm text-stone-500">{member.role}</p></div></div><button className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={onClose} type="button" aria-label="Cerrar"><X size={19} /></button></div><div className="mt-6 grid grid-cols-3 gap-3"><MiniMetric label="Puntaje" value={`${member.score}/100`} /><MiniMetric label="A tiempo" value={`${member.onTime}%`} /><MiniMetric label="Sin retrabajo" value={`${member.firstPass}%`} /></div><div className="mt-7 flex items-center justify-between"><div><h3 className="font-semibold">Asignaciones recientes</h3><p className="mt-1 text-xs text-stone-500">Muestra demostrativa del período</p></div><LoadBadge load={member.load} /></div><div className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 dark:divide-stone-800 dark:border-stone-700">{assignments.map((item) => <div className="p-4" key={item.name}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-stone-500">{item.company}</p></div><Badge className="shrink-0 border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300" variant="outline">{item.state}</Badge></div></div>)}</div><div className="mt-6 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/60"><div className="flex gap-3"><CalendarClock className="mt-0.5 shrink-0 text-stone-500" size={18} /><div><p className="text-sm font-medium">Contexto de la evaluación</p><p className="mt-1 text-xs leading-5 text-stone-500">{member.companies} empresas asignadas, {member.overdue} vencidas y {member.review} listas para revisión. Verifica incidencias y cambios de alcance antes de tomar decisiones.</p></div></div></div></aside></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 p-3 dark:border-stone-700"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}
