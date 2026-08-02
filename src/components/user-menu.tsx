"use client";

import {
  CircleHelp,
  KeyRound,
  LoaderCircle,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDismissableMenu } from "@/hooks/use-dismissable-menu";
import { authClient } from "@/modules/identity/infrastructure/auth-client";

type CurrentAccount = {
  name: string;
  email: string;
  image: string | null;
  position: string;
  role: string;
};

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${words[0][0]}${words.at(-1)?.[0] ?? ""}`
      : (words[0]?.slice(0, 2) ?? "US")
  ).toLocaleUpperCase("es");
}

export function UserMenu() {
  const router = useRouter();
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const [account, setAccount] = useState<CurrentAccount | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/account/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/login");
          return null;
        }
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "No fue posible cargar la cuenta.");
        return body.account as CurrentAccount;
      })
      .then((loaded) => {
        if (active && loaded) setAccount(loaded);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No fue posible cargar la cuenta.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    setError("");
    const { error: signOutError } = await authClient.signOut();
    if (signOutError) {
      setError("No fue posible cerrar la sesión. Intenta nuevamente.");
      setSigningOut(false);
      return;
    }
    setIsOpen(false);
    router.replace("/login");
    router.refresh();
  }

  const name = account?.name ?? "Cargando cuenta…";
  const position = account ? `${account.position} · ${account.role}` : "";
  const fallback = account ? initials(account.name) : "";

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={isOpen}
        aria-label="Abrir menú de usuario"
        className="flex items-center gap-2 rounded-lg p-1 text-left hover:bg-stone-200 dark:hover:bg-stone-800"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <Avatar className="size-9">
          {account?.image && (
            <AvatarImage alt={account.name} src={account.image} />
          )}
          <AvatarFallback className="bg-[#dbe8df] text-xs font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100">
            {account ? (
              fallback
            ) : (
              <LoaderCircle className="animate-spin" size={14} />
            )}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-44 leading-tight lg:block">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-stone-500">
            {position}
          </span>
        </span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center gap-3 px-2 py-2.5">
            <Avatar className="size-10">
              {account?.image && (
                <AvatarImage alt={account.name} src={account.image} />
              )}
              <AvatarFallback className="bg-[#dbe8df] text-sm font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100">
                {fallback || "US"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                {position}
              </p>
              {account && (
                <p className="truncate text-xs text-stone-400">
                  {account.email}
                </p>
              )}
            </div>
          </div>
          {error && (
            <p className="mx-2 mb-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
          <MenuItem icon={UserRound} label="Mi perfil" />
          <MenuItem icon={Settings} label="Preferencias de la firma" />
          <MenuItem icon={KeyRound} label="Seguridad y acceso" />
          <MenuItem icon={CircleHelp} label="Ayuda y soporte" />
          <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
          <MenuItem
            destructive
            disabled={signingOut}
            icon={signingOut ? LoaderCircle : LogOut}
            label={signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            onClick={() => void signOut()}
            spinning={signingOut}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  destructive = false,
  disabled = false,
  onClick,
  spinning = false,
}: {
  icon: typeof UserRound;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm disabled:opacity-50 ${destructive ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className={spinning ? "animate-spin" : undefined} size={16} />
      {label}
    </button>
  );
}
