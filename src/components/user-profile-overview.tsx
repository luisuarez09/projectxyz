"use client";

import { BriefcaseBusiness, KeyRound, LoaderCircle, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CurrentAccount = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  position: string;
  profession: string;
  role: string;
  mfaEnabled: boolean;
};

export function UserProfileOverview() {
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/account/me", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el perfil.");
        return body.account as CurrentAccount;
      })
      .then((loaded) => { if (active) setAccount(loaded); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "No fue posible cargar el perfil."); });
    return () => { active = false; };
  }, []);

  if (!account && !error) return <main className="mx-auto flex min-h-72 max-w-5xl items-center justify-center px-4 text-sm text-stone-500"><LoaderCircle className="mr-2 animate-spin" size={18} /> Cargando perfil...</main>;
  if (!account) return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><UserRound className="mx-auto text-stone-400" size={34} /><h1 className="mt-4 text-2xl font-semibold">Perfil no disponible</h1><p className="mt-2 text-sm text-stone-500">{error}</p></main>;

  return <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-10">
    <header className="flex items-center gap-4">
      <Avatar className="size-14">{account.image && <AvatarImage alt={account.name} src={account.image} />}<AvatarFallback className="bg-[#dbe8df] font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100">{initials(account.name)}</AvatarFallback></Avatar>
      <div className="min-w-0"><p className="text-sm text-stone-500">Mi perfil</p><h1 className="truncate text-3xl font-semibold tracking-tight">{account.name}</h1><p className="mt-1 truncate text-sm text-stone-500">{account.email}</p></div>
    </header>
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <Card className="border-0 shadow-sm"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800"><BriefcaseBusiness size={17} /></span><div><CardTitle>Perfil profesional</CardTitle><CardDescription>Identidad registrada para la firma</CardDescription></div></div></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Detail label="Cargo" value={account.position} /><Detail label="Profesi\u00f3n" value={account.profession} /><Detail icon={Mail} label="Correo de acceso" value={account.email} /><Detail label="Rol" value={account.role} /></CardContent></Card>
      <Card className="border-0 shadow-sm"><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><ShieldCheck size={17} /></span><div><CardTitle>Acceso y seguridad</CardTitle><CardDescription>Estado de la cuenta autenticada</CardDescription></div></div></CardHeader><CardContent className="space-y-5"><Detail icon={KeyRound} label="Autenticaci\u00f3n de dos factores" value={account.mfaEnabled ? "Activa" : "Pendiente de configurar"} /><Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" variant="outline">Cuenta activa</Badge></CardContent></Card>
    </div>
  </main>;
}

function Detail({ icon: Icon, label, value }: { icon?: typeof Mail; label: string; value: string }) { return <div><p className="flex items-center gap-1.5 text-xs font-medium text-stone-500">{Icon && <Icon size={13} />}{label}</p><p className="mt-1 text-sm font-medium leading-5">{value}</p></div>; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
