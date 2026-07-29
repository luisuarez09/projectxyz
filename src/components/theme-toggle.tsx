"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useDismissableMenu } from "@/hooks/use-dismissable-menu";

type Theme = "light" | "dark" | "system";
const options: { value: Theme; label: string; icon: typeof Sun }[] = [{ value: "light", label: "Claro", icon: Sun }, { value: "dark", label: "Oscuro", icon: Moon }, { value: "system", label: "Sistema", icon: Monitor }];

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && prefersDark));
}

export function ThemeToggle() {
  const { isOpen, ref, setIsOpen } = useDismissableMenu<HTMLDivElement>();
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const savedTheme = (window.localStorage.getItem("proyectoxyz-theme") as Theme | null) ?? "system";
    setTheme(savedTheme); applyTheme(savedTheme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => savedTheme === "system" && applyTheme("system");
    media.addEventListener("change", followSystem); return () => media.removeEventListener("change", followSystem);
  }, []);
  function changeTheme(nextTheme: Theme) { setTheme(nextTheme); window.localStorage.setItem("proyectoxyz-theme", nextTheme); applyTheme(nextTheme); setIsOpen(false); }
  const CurrentIcon = options.find((option) => option.value === theme)?.icon ?? Monitor;
  return <div className="relative" ref={ref}><button aria-expanded={isOpen} aria-label="Cambiar tema" className="grid size-9 place-items-center rounded-lg text-stone-500 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800" onClick={() => setIsOpen((open) => !open)} type="button"><CurrentIcon size={18} /></button>{isOpen && <div className="absolute right-0 top-11 z-30 w-40 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-700 dark:bg-stone-900"><p className="px-2 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">Apariencia</p>{options.map(({ value, label, icon: Icon }) => <button className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${theme === value ? "bg-[#e7f0e9] font-medium text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`} key={value} onClick={() => changeTheme(value)} type="button"><Icon size={16} /> {label}</button>)}</div>}</div>;
}
