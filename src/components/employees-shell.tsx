"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const sections = [
  { id: "resumen", label: "Resumen", href: "/empleados" },
  { id: "directorio", label: "Directorio", href: "/empleados/directorio" },
  { id: "nomina", label: "Nómina", href: "/empleados/nomina" },
  { id: "vacaciones", label: "Vacaciones", href: "/empleados/vacaciones" },
  { id: "utilidades", label: "Utilidades", href: "/empleados/utilidades" },
  { id: "liquidaciones", label: "Liquidaciones", href: "/empleados/liquidaciones" },
] as const;

export function EmployeesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = pathname === "/empleados" ? "resumen" : sections.find((item) => item.href !== "/empleados" && pathname.startsWith(item.href))?.id ?? "directorio";
  return (
    <div className="min-w-0">
      <nav aria-label="Secciones de empleados" className="border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 lg:hidden">
        <div className="flex gap-1 overflow-x-auto py-2">
          {sections.map((item) => (
            <Link
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${activeSection === item.id ? "bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"}`}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
