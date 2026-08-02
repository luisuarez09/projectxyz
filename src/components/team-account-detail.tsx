"use client";

import { ArrowLeft, BriefcaseBusiness, Building2, Clock3, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { TeamDirectoryAccount } from "@/components/team-accounts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function accountStatus(account: TeamDirectoryAccount) {
  if (account.kind === "INVITATION") return account.expired ? "Invitación vencida" : "Invitación pendiente";
  return account.active ? "Activa" : "Desactivada";
}

function statusTone(status: string) {
  if (status === "Activa") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Invitación pendiente") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Invitación vencida") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-stone-200 bg-stone-100 text-stone-600";
}

export function TeamAccountDetail({ accountId, kind }: { accountId: string; kind: string }) {
  const [account, setAccount] = useState<TeamDirectoryAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/team", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar la cuenta.");
        const expectedKind = kind === "invitation" ? "INVITATION" : "MEMBER";
        const selected = (body.accounts as TeamDirectoryAccount[]).find((item) => item.id === accountId && item.kind === expectedKind);
        if (!selected) throw new Error("La cuenta solicitada no está disponible.");
        setAccount(selected);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "No fue posible cargar la cuenta.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [accountId, kind]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-stone-500 sm:px-6 lg:px-10">Cargando cuenta…</div>;

  if (!account) return <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6"><UserRound className="mx-auto text-stone-400" size={34} /><h1 className="mt-4 text-2xl font-semibold">Cuenta no disponible</h1><p className="mt-2 text-sm text-stone-500">{error}</p><Link className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#14352d] hover:underline dark:text-emerald-300" href="/equipo/cuentas"><ArrowLeft size={16} /> Volver a cuentas</Link></div>;

  const status = accountStatus(account);
  const lastAccess = account.lastAccessAt
    ? new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeStyle: "short" }).format(new Date(account.lastAccessAt))
    : "Sin acceso registrado";

  return <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
    <Link className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100" href="/equipo/cuentas"><ArrowLeft size={16} /> Cuentas del equipo</Link>
    <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-14"><AvatarFallback className="text-base">{initials(account.name)}</AvatarFallback></Avatar>
        <div className="min-w-0"><p className="text-sm text-stone-500">{account.kind === "MEMBER" ? "Cuenta del equipo" : "Invitación del equipo"}</p><h1 className="truncate text-3xl font-semibold tracking-tight">{account.name}</h1><p className="mt-1 truncate text-sm text-stone-500">{account.email}</p></div>
      </div>
      <Badge className={statusTone(status)} variant="outline">{status}</Badge>
    </header>

    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card className="border-0 shadow-sm"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800"><BriefcaseBusiness size={17} /></span><div><CardTitle>Perfil profesional</CardTitle><CardDescription>Identidad registrada para la firma</CardDescription></div></div></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Detail label="Cargo" value={account.position} /><Detail label="Profesión" value={account.profession} /><Detail icon={Mail} label="Correo de acceso" value={account.email} /><Detail label="Tipo de registro" value={account.kind === "MEMBER" ? "Cuenta activa del equipo" : "Invitación pendiente de aceptación"} /></CardContent></Card>

      <Card className="border-0 shadow-sm"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><ShieldCheck size={17} /></span><div><CardTitle>Acceso y seguridad</CardTitle><CardDescription>Rol, alcance y controles de autenticación</CardDescription></div></div></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Detail label="Rol" value={account.role?.name ?? "Sin rol asignado"} /><Detail label="Alcance" value={account.firmWide ? "Toda la firma" : `${account.companies.length} ${account.companies.length === 1 ? "empresa" : "empresas"}`} /><Detail icon={ShieldCheck} label="Autenticación MFA" value={account.kind === "MEMBER" ? account.mfaEnabled ? "Activa" : "Pendiente" : "Disponible al aceptar la invitación"} /><Detail icon={Clock3} label="Último acceso" value={lastAccess} /></CardContent></Card>
    </div>

    <Card className="mt-5 border-0 shadow-sm"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950"><Building2 size={17} /></span><div><CardTitle>Empresas autorizadas</CardTitle><CardDescription>{account.firmWide ? "Esta cuenta tiene alcance administrativo sobre toda la firma." : "Empresas incluidas en el alcance actual de la cuenta."}</CardDescription></div></div></CardHeader><CardContent>{account.firmWide ? <Badge variant="outline">Toda la firma</Badge> : account.companies.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{account.companies.map((company) => <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-800" key={company.id}><span className="grid size-8 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800"><Building2 size={15} /></span><span className="text-sm font-medium">{company.legalName}</span></div>)}</div> : <p className="text-sm text-stone-500">No hay empresas asignadas.</p>}</CardContent></Card>
  </div>;
}

function Detail({ icon: Icon, label, value }: { icon?: typeof Mail; label: string; value: string }) { return <div><p className="flex items-center gap-1.5 text-xs font-medium text-stone-500">{Icon && <Icon size={13} />}{label}</p><p className="mt-1 text-sm font-medium leading-5">{value}</p></div>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
