"use client";

import { Bell, CalendarClock, CheckCheck, CircleAlert, FileWarning } from "lucide-react";

import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

const notifications = [
  { icon: CircleAlert, title: "Retención de IVA vence hoy", detail: "Distribuidora El Roble, C.A.", color: "text-rose-500" },
  { icon: FileWarning, title: "Declaración lista para revisión", detail: "Inversiones Costa Azul, C.A.", color: "text-amber-500" },
  { icon: CalendarClock, title: "2 vencimientos esta semana", detail: "Revisa el calendario fiscal", color: "text-sky-500" },
];

export function NotificationMenu() {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  return <div className="relative" ref={ref}><button aria-expanded={isOpen} aria-label="Notificaciones" className="relative grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button"><Bell size={19} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" /></button>{isOpen && <div className="absolute right-0 top-11 z-30 w-88 rounded-xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900"><div className="flex items-center justify-between px-2 py-1.5"><p className="text-sm font-semibold">Notificaciones</p><button className="flex items-center gap-1 text-xs font-medium text-[#14352d] hover:underline dark:text-emerald-300" onClick={() => setIsOpen(false)} type="button"><CheckCheck size={14} /> Marcar leídas</button></div><div className="mt-1 divide-y divide-stone-100 dark:divide-stone-800">{notifications.map(({ icon: Icon, title, detail, color }) => <button className="flex w-full gap-3 px-2 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800" key={title} type="button"><Icon className={`mt-0.5 shrink-0 ${color}`} size={18} /><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">{detail}</span></span></button>)}</div><button className="mt-1 w-full rounded-lg py-2 text-sm font-medium text-[#14352d] hover:bg-stone-100 dark:text-emerald-300 dark:hover:bg-stone-800" onClick={() => setIsOpen(false)} type="button">Ver todas las notificaciones</button></div>}</div>;
}
