import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { NewCompanyWizard } from "@/components/new-company-wizard";

export default function NewCompanyPage() {
  return <main className="min-h-screen bg-[#f7f7f4] px-4 py-8 text-stone-900 dark:bg-stone-950 dark:text-stone-100"><div className="mx-auto max-w-4xl"><Link className="inline-flex items-center gap-1 text-sm font-medium text-[#14352d] hover:underline dark:text-emerald-300" href="/empresas"><ArrowLeft size={16} /> Empresas</Link><div className="mt-6"><p className="text-sm font-medium text-[#30745f] dark:text-emerald-300">Registro de empresa</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Nueva empresa</h1><p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-300">Crea primero la ficha operativa. El expediente legal, los documentos y los accesos permanecen separados y protegidos, pero vinculados a esta empresa.</p></div><NewCompanyWizard /></div></main>;
}
