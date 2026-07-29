"use client";

import { CircleHelp, KeyRound, LogOut, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

export function UserMenu() {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  return <div className="relative" ref={ref}><button aria-expanded={isOpen} aria-label="Abrir menú de usuario" className="flex rounded-lg p-0.5 hover:bg-stone-200 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button"><Avatar className="size-9"><AvatarFallback className="bg-[#dbe8df] text-xs font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100">LU</AvatarFallback></Avatar></button>{isOpen && <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900"><div className="flex items-center gap-3 px-2 py-2.5"><Avatar className="size-10"><AvatarFallback className="bg-[#dbe8df] text-sm font-semibold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100">LU</AvatarFallback></Avatar><div><p className="text-sm font-semibold">Luis Suarez</p><p className="text-xs text-stone-500 dark:text-stone-400">CEO</p></div></div><div className="my-1 border-t border-stone-100 dark:border-stone-800" /><MenuItem icon={UserRound} label="Mi perfil" /><MenuItem icon={Settings} label="Preferencias de la firma" /><MenuItem icon={KeyRound} label="Seguridad y acceso" /><MenuItem icon={CircleHelp} label="Ayuda y soporte" /><div className="my-1 border-t border-stone-100 dark:border-stone-800" /><MenuItem destructive icon={LogOut} label="Cerrar sesión" /></div>}</div>;
}
function MenuItem({ icon: Icon, label, destructive = false }: { icon: typeof UserRound; label: string; destructive?: boolean }) { return <button className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm ${destructive ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`} type="button"><Icon size={16} />{label}</button>; }
