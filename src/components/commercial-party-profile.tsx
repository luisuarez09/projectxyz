"use client";

import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, CalendarDays, FileText, Loader2, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { PartyKind } from "@/components/party-directory";

type Party = {
  id: string;
  legalName: string;
  rif: string;
  fiscalAddress: string;
  email: string;
  phone: string;
  primaryAccount: string;
  counterpartAccount: string;
};
type CommercialDocument = {
  id: string;
  documentNumber: string;
  issueDate: string;
  currencyCode: string;
  taxableBase: string;
  exemptAmount: string;
  taxAmount: string;
  totalAmount: string;
  status: string;
};
type ProfilePayload = {
  party: Party;
  documents: CommercialDocument[];
  summary: {
    documentCount: number;
    totalsByCurrency: Record<string, string>;
    lastIssueDate: string | null;
    currencies: string[];
  };
};

async function readResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "No fue posible cargar la ficha.");
  return payload as T;
}

function formatAmount(value: string, currency: string) {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "Sin movimientos";
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function CommercialPartyProfile({ id, kind }: { id: string; kind: PartyKind }) {
  const isCustomer = kind === "customer";
  const noun = isCustomer ? "cliente" : "proveedor";
  const directoryUrl = isCustomer ? "/operaciones/clientes" : "/operaciones/proveedores";
  const newDocumentUrl = isCustomer ? "/operaciones/ventas/nueva" : "/operaciones/compras/nueva";
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/counterparties/${id}?kind=${kind}`, { cache: "no-store" })
      .then((response) => readResponse<ProfilePayload>(response))
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No fue posible cargar la ficha."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, kind]);

  if (loading) return <div className="mx-auto grid min-h-[50vh] max-w-7xl place-items-center px-5 py-8"><span className="inline-flex items-center gap-2 text-sm text-stone-500"><Loader2 className="animate-spin" size={17} /> Cargando perfil...</span></div>;
  if (!data) return <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10"><Link className="inline-flex items-center gap-2 text-sm font-medium text-[#14352d] dark:text-emerald-300" href={directoryUrl}><ArrowLeft size={16} /> Volver al directorio</Link><p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error || "No se encontró la ficha."}</p></div>;

  const totalEntries = Object.entries(data.summary.totalsByCurrency);
  const totalLabel = totalEntries.length === 0
    ? "Sin movimientos"
    : totalEntries.length === 1
      ? formatAmount(totalEntries[0][1], totalEntries[0][0])
      : totalEntries.map(([currency, total]) => `${currency} ${Number(total).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`).join(" · ");

  return <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
    <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-[#14352d] dark:text-stone-300" href={directoryUrl}><ArrowLeft size={16} /> Volver a {isCustomer ? "clientes" : "proveedores"}</Link>
        <div className="mt-5 flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950/40 dark:text-emerald-300"><Building2 size={22} /></span><div><p className="text-sm text-stone-500">Perfil de {noun}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{data.party.legalName}</h1><p className="mt-1 font-medium text-stone-600 dark:text-stone-300">{data.party.rif}</p></div></div>
      </div>
      <Link className={buttonVariants({ className: "bg-[#14352d] text-white hover:bg-[#0e2821]" })} href={newDocumentUrl}><FileText /> Registrar {isCustomer ? "venta" : "compra"}</Link>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <SummaryCard label="Facturas registradas" value={String(data.summary.documentCount)} />
      <SummaryCard label="Monto acumulado" value={totalLabel} />
      <SummaryCard label="Último movimiento" value={formatDate(data.summary.lastIssueDate)} />
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="font-semibold">Datos fiscales y contacto</h2><dl className="mt-4 space-y-4 text-sm"><ProfileRow icon={<MapPin size={16} />} label="Dirección fiscal" value={data.party.fiscalAddress || "Sin registrar"} /><ProfileRow icon={<Mail size={16} />} label="Correo" value={data.party.email || "Sin registrar"} /><ProfileRow icon={<Phone size={16} />} label="Teléfono" value={data.party.phone || "Sin registrar"} /></dl><div className="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-500 dark:border-stone-800">La consulta automática del RIF en SENIAT permanece pendiente hasta que el servicio esté disponible.</div></section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="font-semibold">Configuración contable</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs text-stone-500">{isCustomer ? "Cuenta por cobrar" : "Cuenta de gasto"}</dt><dd className="mt-1 font-medium">{data.party.primaryAccount}</dd></div><div><dt className="text-xs text-stone-500">{isCustomer ? "Cuenta de ingresos" : "Cuenta por pagar"}</dt><dd className="mt-1 font-medium">{data.party.counterpartAccount}</dd></div></dl></section>
      </aside>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800"><h2 className="font-semibold">Movimientos de facturas</h2><p className="mt-1 text-sm text-stone-500">Facturas {isCustomer ? "de venta" : "de compra"} registradas para esta empresa activa.</p></div>
        <div className="overflow-x-auto"><Table className="min-w-[760px]"><TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-900/50"><TableRow><TableHead className="px-5 py-3">Fecha</TableHead><TableHead className="px-5 py-3">N.º de factura</TableHead><TableHead className="px-5 py-3 text-right">Base imponible</TableHead><TableHead className="px-5 py-3 text-right">IVA</TableHead><TableHead className="px-5 py-3 text-right">Total</TableHead><TableHead className="px-5 py-3">Estado</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {data.documents.map((document) => <TableRow key={document.id}><TableCell className="px-5 py-4"><span className="inline-flex items-center gap-2"><CalendarDays className="text-stone-400" size={15} /> {formatDate(document.issueDate)}</span></TableCell><TableCell className="px-5 py-4 font-medium">{document.documentNumber}</TableCell><TableCell className="px-5 py-4 text-right tabular-nums">{formatAmount(document.taxableBase, document.currencyCode)}</TableCell><TableCell className="px-5 py-4 text-right tabular-nums">{formatAmount(document.taxAmount, document.currencyCode)}</TableCell><TableCell className="px-5 py-4 text-right font-semibold tabular-nums">{formatAmount(document.totalAmount, document.currencyCode)}</TableCell><TableCell className="px-5 py-4"><span className={document.status === "registered" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"}>{document.status === "registered" ? "Registrada" : "Anulada"}</span></TableCell></TableRow>)}
          {!data.documents.length && <TableRow><TableCell className="px-5 py-14 text-center text-stone-500" colSpan={6}>Aún no hay facturas registradas para este {noun}.</TableCell></TableRow>}
        </TableBody></Table></div>
      </section>
    </div>
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 truncate text-xl font-semibold" title={value}>{value}</p></div>;
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3"><span className="mt-0.5 text-stone-400">{icon}</span><div><dt className="text-xs text-stone-500">{label}</dt><dd className="mt-0.5 leading-5 text-stone-700 dark:text-stone-200">{value}</dd></div></div>;
}
