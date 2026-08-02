"use client";

import { AlertTriangle, Building2, CheckCircle2, Clock3, ListChecks, LoaderCircle, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Account = {
  kind: "MEMBER" | "INVITATION";
  id: string;
  name: string;
  email: string;
  position: string;
  active: boolean;
  firmWide: boolean;
  companies: Array<{ id: string; legalName: string }>;
  role: { name: string } | null;
  lastAccessAt: string | null;
  mfaEnabled: boolean;
  expired?: boolean;
};

const chartConfig = { companies: { label: "Empresas asignadas", color: "#2f715f" } } satisfies ChartConfig;

export function TeamOverview() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companyCount, setCompanyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/team", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el equipo.");
        if (active) { setAccounts(body.accounts); setCompanyCount(body.companies.length); }
      })
      .catch((reason: Error) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const members = accounts.filter((account) => account.kind === "MEMBER");
  const pending = accounts.filter((account) => account.kind === "INVITATION" && !account.expired).length;
  const activeMembers = members.filter(({ active }) => active);
  const mfaPending = activeMembers.filter(({ mfaEnabled }) => !mfaEnabled).length;
  const chartData = activeMembers.map((member) => ({
    responsible: member.name.split(/\s+/)[0],
    companies: member.firmWide ? companyCount : member.companies.length,
  }));

  if (loading) return <div className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-stone-400" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm text-stone-500">Gestión de la firma</p><Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">Datos reales</Badge></div><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Equipo</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Supervisa cuentas, seguridad y distribución de acceso sobre las empresas registradas.</p></div><Link className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white" href="/equipo/cuentas"><UsersRound size={16} /> Administrar cuentas</Link></div>
      {error && <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary icon={UsersRound} label="Integrantes activos" value={String(activeMembers.length)} detail="Con perfil habilitado" tone="emerald" /><Summary icon={Clock3} label="Invitaciones" value={String(pending)} detail="Pendientes de activación" tone="blue" /><Summary icon={ShieldCheck} label="MFA pendiente" value={String(mfaPending)} detail="Personal activo sin segundo factor" tone={mfaPending ? "amber" : "emerald"} /><Summary icon={Building2} label="Empresas" value={String(companyCount)} detail="Disponibles para asignación" tone="blue" /></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Empresas visibles por integrante</CardTitle><CardDescription>Asignaciones activas registradas en PostgreSQL</CardDescription></CardHeader><CardContent>{chartData.length ? <ChartContainer className="h-[280px] w-full" config={chartConfig} initialDimension={{ width: 620, height: 280 }}><BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 8 }}><CartesianGrid vertical={false} /><XAxis axisLine={false} dataKey="responsible" tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} /><ChartTooltip content={<ChartTooltipContent />} cursor={false} /><Bar dataKey="companies" fill="var(--color-companies)" radius={[6, 6, 0, 0]} /></BarChart></ChartContainer> : <Empty text="Todavía no hay integrantes activos para representar." />}</CardContent></Card>
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle>Estado operativo</CardTitle><CardDescription>Límites honestos de esta fase</CardDescription></CardHeader><CardContent className="space-y-3"><StateLine done label="Identidades y perfiles persistidos" /><StateLine done label="Roles y alcance por empresa" /><StateLine done label="Sesiones y MFA visibles" /><StateLine label="Métricas de tareas y declaraciones" /><p className="rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-500 dark:bg-stone-800">Puntualidad, calidad y carga no se calcularán hasta que las tareas y expedientes reales de la Fase 2 existan. Se retiraron los porcentajes demostrativos.</p></CardContent></Card>
      </div>
      <Card className="mt-6 overflow-hidden border-0 shadow-sm"><CardHeader><CardTitle>Directorio y seguridad</CardTitle><CardDescription>Estado verificable de cada cuenta activa</CardDescription></CardHeader><div className="overflow-x-auto"><Table className="min-w-[780px]"><TableHeader><TableRow><TableHead>Integrante</TableHead><TableHead>Rol</TableHead><TableHead>Alcance</TableHead><TableHead>MFA</TableHead><TableHead>Último acceso</TableHead></TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.id}><TableCell><div className="flex items-center gap-3"><Avatar><AvatarFallback>{initials(member.name)}</AvatarFallback></Avatar><div><p className="font-medium">{member.name}</p><p className="text-xs text-stone-500">{member.email}</p></div></div></TableCell><TableCell>{member.role?.name ?? "Sin rol"}</TableCell><TableCell>{member.firmWide ? "Firma completa" : `${member.companies.length} empresas`}</TableCell><TableCell><Badge className={member.mfaEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"} variant="outline">{member.mfaEnabled ? "Activo" : "Pendiente"}</Badge></TableCell><TableCell className="text-xs text-stone-500">{member.lastAccessAt ? new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(member.lastAccessAt)) : "Sin sesión registrada"}</TableCell></TableRow>)}{members.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={5}>No hay integrantes registrados.</TableCell></TableRow>}</TableBody></Table></div></Card>
      <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><p>El MFA está previsto como obligatorio para el personal. Las cuentas sin segundo factor se muestran como pendientes hasta completar el flujo de enrolamiento.</p></div>
    </div>
  );
}

function Summary({ icon: Icon, label, value, detail, tone }: { icon: typeof UsersRound; label: string; value: string; detail: string; tone: "emerald" | "blue" | "amber" }) { const colors = { emerald: "bg-emerald-50 text-emerald-600", blue: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-700" }; return <Card className="border-0 shadow-sm"><CardContent className="flex items-start justify-between pt-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div><span className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><Icon size={18} /></span></CardContent></Card>; }
function StateLine({ done = false, label }: { done?: boolean; label: string }) { return <div className="flex items-center gap-2 text-sm">{done ? <CheckCircle2 className="text-emerald-600" size={17} /> : <ListChecks className="text-stone-400" size={17} />}<span>{label}</span><span className="ml-auto text-xs text-stone-500">{done ? "Conectado" : "Pendiente"}</span></div>; }
function Empty({ text }: { text: string }) { return <div className="grid h-[280px] place-items-center rounded-xl border border-dashed border-stone-200 text-center text-sm text-stone-500">{text}</div>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
