"use client";

import { AlertCircle, ArrowLeft, BadgeCheck, BookOpen, Calculator, Check, CircleCheck, FileCheck2, FileClock, FileSpreadsheet, FileText, LoaderCircle, LockKeyhole, Pencil, ReceiptText, RefreshCw, Save, ShieldCheck, ShoppingCart, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { AttachmentInput } from "@/components/ui/attachment-input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateIvaDetermination } from "@/modules/declarations/domain/iva";
import { buildIvaFiscalBookSnapshot, type IvaFiscalBookSnapshot } from "@/modules/declarations/domain/iva-books";

type Status = "PENDING" | "PREPARING" | "READY_FOR_REVIEW" | "SUBMITTED" | "PAID" | "CLOSED" | "INCIDENT" | "NOT_APPLICABLE";
type BookRetention = { receiptNumber: string; percentage: string; amount: string };
type Sale = { id: string; date: string; customer: string; rif: string; documentNumber: string; taxableBase: string; exemptAmount: string; nonTaxableAmount: string; taxAmount: string; totalAmount: string; vatRate: string; taxRateName: string; retentions: BookRetention[] };
type Purchase = { id: string; date: string; supplier: string; rif: string; documentNumber: string; originPeriod: string; taxableBase: string; exemptAmount: string; nonTaxableAmount: string; taxAmount: string; totalAmount: string; vatRate: string; taxRateName: string; retentions: BookRetention[]; selected: boolean; vatCreditStatus?: "PENDING" | "APPLIED" | "EXCLUDED" | null; hasVatCredit?: boolean };
type Retention = { id: string; date: string; customer: string; rif: string; invoiceNumber: string; receiptNumber: string; percentage: string; amount: string; voucher: { name: string; status: string } | null; selected: boolean };
type EvidenceKind = "SOLVENCY" | "DECLARATION_RECEIPT" | "DECLARATION_FILE" | "PAYMENT_FORM" | "PAYMENT_RECEIPT";
type Workspace = {
  declaration: { id: string; version: number; period: string; periodLabel: string; status: Status; filedAt: string; declaredAmount: string; previousFiscalCredit: string; previousRetentionCredit: string; determinedAt: string | null };
  fiscalBookSnapshot: IvaFiscalBookSnapshot | null;
  company: { id: string; legalName: string; rif: string; fiscalAddress: string | null };
  case: { id: string; dueDate: string; source: string; ruleVersion: number; requirements: Array<{ kind: EvidenceKind; required: boolean; fiscalBoard: boolean; label: string }>; evidences: Array<{ id: string; kind: EvidenceKind; name: string; status: string }> };
  sales: Sale[];
  purchases: Purchase[];
  retentions: Retention[];
  canManage: boolean;
};

const money = new Intl.NumberFormat("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const statusLabels: Record<Status, string> = { PENDING: "Pendiente", PREPARING: "En preparación", READY_FOR_REVIEW: "Listo para revisión", SUBMITTED: "Declarada", PAID: "Pagada", CLOSED: "Cerrada", INCIDENT: "Con incidencia", NOT_APPLICABLE: "No aplica" };

function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function displayDate(value: string) {
  return value ? date.format(new Date(`${value}T00:00:00.000Z`)) : "—";
}

function calculate(data: Workspace | null, selectedPurchases: Set<string>, selectedRetentions: Set<string>, customPreviousFiscalCredit?: string, customPreviousRetentionCredit?: string) {
  const sales = data?.sales ?? [];
  const purchases = (data?.purchases ?? []).filter(({ id }) => selectedPurchases.has(id));
  const retentions = (data?.retentions ?? []).filter(({ id }) => selectedRetentions.has(id));
  const nonTaxableAmount = sales.reduce((sum, item) => sum + amount(item.nonTaxableAmount), 0);
  const previousFiscalCredit = amount(customPreviousFiscalCredit !== undefined && customPreviousFiscalCredit !== "" ? customPreviousFiscalCredit : data?.declaration.previousFiscalCredit);
  const previousRetentionCredit = amount(customPreviousRetentionCredit !== undefined && customPreviousRetentionCredit !== "" ? customPreviousRetentionCredit : data?.declaration.previousRetentionCredit);
  return {
    ...calculateIvaDetermination({
      sales: sales.map((item) => ({ taxableBase: amount(item.taxableBase), exemptAmount: amount(item.exemptAmount), taxAmount: amount(item.taxAmount) })),
      purchases: purchases.map((item) => ({
        taxAmount: (item.hasVatCredit ?? (item.vatCreditStatus === "PENDING" && amount(item.taxAmount) > 0)) ? amount(item.taxAmount) : 0
      })),
      retentions: retentions.map((item) => ({ amount: amount(item.amount) })),
      previousFiscalCredit,
      previousRetentionCredit,
    }),
    nonTaxableAmount,
    previousFiscalCredit,
    previousRetentionCredit,
  };
}

export function IvaDeclarationWorkspace({ period }: { period: string }) {
  const { activeCompanyId, loading: companyLoading } = useCompanyContext();
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"determination" | "sales" | "purchases" | "retentions" | "books" | "seniatForm" | "closing">("determination");
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
  const [selectedRetentions, setSelectedRetentions] = useState<Set<string>>(new Set());
  const [filedAt, setFiledAt] = useState("");
  const [declaredAmount, setDeclaredAmount] = useState("");
  const [confirmDifference, setConfirmDifference] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<EvidenceKind | null>(null);
  const [customPreviousFiscalCredit, setCustomPreviousFiscalCredit] = useState("");
  const [customPreviousRetentionCredit, setCustomPreviousRetentionCredit] = useState("");

  const applyWorkspace = useCallback((workspace: Workspace) => {
    setData(workspace);
    setSelectedPurchases(new Set(workspace.purchases.filter(({ selected }) => selected).map(({ id }) => id)));
    setSelectedRetentions(new Set(workspace.retentions.filter(({ selected }) => selected).map(({ id }) => id)));
    setFiledAt(workspace.declaration.filedAt);
    setDeclaredAmount(workspace.declaration.declaredAmount);
  }, []);

  const load = useCallback(async () => {
    if (!activeCompanyId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/declarations/iva?period=${period}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar la declaración de IVA.");
      applyWorkspace(body);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar la declaración de IVA.");
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, applyWorkspace, period]);

  useEffect(() => { if (!companyLoading) void load(); }, [companyLoading, load]);

  const totals = useMemo(() => calculate(data, selectedPurchases, selectedRetentions, customPreviousFiscalCredit, customPreviousRetentionCredit), [data, selectedPurchases, selectedRetentions, customPreviousFiscalCredit, customPreviousRetentionCredit]);
  const closed = data ? ["SUBMITTED", "PAID", "CLOSED"].includes(data.declaration.status) : false;
  const allPurchasesSelected = Boolean(data?.purchases.length) && selectedPurchases.size === data?.purchases.length;
  const allRetentionsSelected = Boolean(data?.retentions.length) && selectedRetentions.size === data?.retentions.length;
  const actualDeclaredAmount = declaredAmount === "" ? totals.taxPayable : amount(declaredAmount.replace(",", "."));
  const hasDifference = Math.abs(actualDeclaredAmount - totals.taxPayable) > 0.01;

  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setMessage("");
  }

  async function mutate(action: "save" | "review" | "close") {
    if (!data) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/declarations/iva", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          period,
          action,
          version: data.declaration.version,
          selectedPurchaseIds: [...selectedPurchases],
          selectedRetentionIds: [...selectedRetentions],
          filedAt,
          declaredAmount: declaredAmount || String(totals.taxPayable),
          confirmDifference,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible guardar la determinación.");
      applyWorkspace(body);
      setMessage(action === "close" ? "La declaración quedó declarada. El compromiso de pago ya está disponible para este expediente." : action === "review" ? "La determinación quedó lista para revisión." : "Borrador guardado.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible guardar la determinación.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadEvidence(kind: EvidenceKind, file: File | null) {
    if (!data || !file) return;
    setUploading(kind);
    setError("");
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const response = await fetch(`/api/calendar/${data.case.id}/evidence`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No fue posible cargar el soporte.");
      await load();
      setMessage("Soporte cargado en el expediente.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar el soporte.");
    } finally {
      setUploading(null);
    }
  }

  if (companyLoading || loading) return <State icon={LoaderCircle} title="Preparando determinación" description="Consolidando ventas, compras, retenciones y saldos anteriores…" spin />;
  if (!activeCompanyId) return <State icon={ReceiptText} title="Selecciona una empresa" description="El expediente de IVA se determina dentro del contexto de una empresa específica." />;
  if (!data) return <State icon={AlertCircle} title="No fue posible abrir el expediente" description={error || "Verifica que el IVA esté habilitado y tenga una plantilla vigente en la configuración de la firma."} action={<Button onClick={() => void load()} variant="outline"><RefreshCw /> Reintentar</Button>} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div><Link className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-[#14352d] dark:hover:text-emerald-200" href="/declaraciones"><ArrowLeft size={15} /> Declaraciones</Link><div className="mt-4 flex flex-wrap items-center gap-2"><p className="text-sm text-stone-500">IVA / {data.declaration.periodLabel}</p><StatusBadge status={data.declaration.status} /></div><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Determinación de IVA</h1><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{data.company.legalName} · RIF {data.company.rif}</p></div>
        {!closed && <div className="flex flex-wrap gap-2"><Button disabled={!data.canManage || saving} onClick={() => void mutate("save")} variant="outline">{saving ? <LoaderCircle className="animate-spin" /> : <Save />} Guardar borrador</Button><Button className="bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={!data.canManage || saving} onClick={() => void mutate("review")}><Check /> Listo para revisión</Button></div>}
      </div>

      {(error || message) && <div aria-live="polite" className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950"}`}>{error ? <AlertCircle className="mt-0.5 shrink-0" size={16} /> : <CircleCheck className="mt-0.5 shrink-0" size={16} />}{error || message}</div>}
      {closed && <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><LockKeyhole className="mt-0.5 shrink-0" size={18} /><div><p className="font-semibold">Declaración presentada</p><p className="mt-1 text-emerald-800 dark:text-emerald-200">Las facturas, retenciones, saldos y evidencias quedan disponibles en modo consulta. Si hay monto por pagar, continúa en Compromisos.</p><Link className="mt-3 inline-flex font-semibold underline underline-offset-2" href="/compromisos-de-pago">Ver compromiso de pago</Link></div></div>}

      <div className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 md:grid-cols-4"><Workflow number="1" label="Ventas consolidadas" detail={`${data.sales.length} documentos del período`} done /><Workflow number="2" label="Créditos seleccionados" detail={`${selectedPurchases.size} compras · ${selectedRetentions.size} retenciones`} done={selectedPurchases.size > 0 || selectedRetentions.size > 0} /><Workflow number="3" label="Revisión interna" detail={data.declaration.status === "READY_FOR_REVIEW" ? "Lista para presentar" : closed ? "Revisión completada" : "Pendiente"} done={data.declaration.status === "READY_FOR_REVIEW" || closed} /><Workflow number="4" label="Presentación y cierre" detail={closed ? `Presentada ${displayDate(data.declaration.filedAt)}` : "Pendiente de SENIAT"} done={closed} /></div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-stone-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-stone-800" aria-label="Secciones de la declaración">{[["determination", "Determinación"], ["sales", `Ventas (${data.sales.length})`], ["purchases", `Compras (${data.purchases.length})`], ["retentions", `Retenciones (${data.retentions.length})`], ["books", "Libros fiscales"], ["seniatForm", "Guía SENIAT (Forma 99030)"], ["closing", "Presentación y cierre"]].map(([id, label]) => <button className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${tab === id ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"}`} key={id} onClick={() => setTab(id as typeof tab)} type="button">{label}</button>)}</nav>

      {tab === "determination" && <Determination data={data} onGo={setTab} totals={totals} closed={closed} customPreviousFiscalCredit={customPreviousFiscalCredit} setCustomPreviousFiscalCredit={setCustomPreviousFiscalCredit} customPreviousRetentionCredit={customPreviousRetentionCredit} setCustomPreviousRetentionCredit={setCustomPreviousRetentionCredit} />}
      {tab === "sales" && <SalesTab sales={data.sales} totals={totals} />}
      {tab === "purchases" && <PurchasesTab closed={closed} data={data} selected={selectedPurchases} setSelected={setSelectedPurchases} toggle={(id) => toggle(setSelectedPurchases, id)} totals={totals} allSelected={allPurchasesSelected} />}
      {tab === "retentions" && <RetentionsTab closed={closed} data={data} selected={selectedRetentions} setSelected={setSelectedRetentions} toggle={(id) => toggle(setSelectedRetentions, id)} totals={totals} allSelected={allRetentionsSelected} />}
      {tab === "books" && <BooksTab closed={closed} data={data} selectedPurchases={selectedPurchases} />}
      {tab === "seniatForm" && <SeniatFormTab data={data} selectedPurchases={selectedPurchases} totals={totals} />}
      {tab === "closing" && <ClosingTab closed={closed} confirmDifference={confirmDifference} data={data} declaredAmount={declaredAmount} filedAt={filedAt} hasDifference={hasDifference} onAmount={setDeclaredAmount} onConfirmDifference={setConfirmDifference} onDate={setFiledAt} onUpload={uploadEvidence} onClose={() => void mutate("close")} saving={saving} totals={totals} uploading={uploading} />}
    </div>
  );
}

type Totals = ReturnType<typeof calculate>;

function Determination({ data, totals, onGo, closed, customPreviousFiscalCredit, setCustomPreviousFiscalCredit, customPreviousRetentionCredit, setCustomPreviousRetentionCredit }: { data: Workspace; totals: Totals; onGo: (tab: "purchases" | "retentions" | "closing" | "seniatForm") => void; closed: boolean; customPreviousFiscalCredit: string; setCustomPreviousFiscalCredit: (val: string) => void; customPreviousRetentionCredit: string; setCustomPreviousRetentionCredit: (val: string) => void }) {
  return <section className="mt-6 space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={TrendingUp} label="Débito fiscal" value={money.format(totals.debitTax)} detail={`${data.sales.length} ventas del período`} tone="stone" /><Metric icon={ShoppingCart} label="Crédito deducible" value={money.format(totals.deductibleTaxCredit)} detail={totals.prorationFactor === null ? `${totals.purchaseTaxCredit ? "Sin prorrateo" : "Sin compras seleccionadas"}` : `Prorrateado a ${number.format(totals.prorationFactor * 100)} %`} tone="sky" /><Metric icon={ShieldCheck} label="Retenciones disponibles" value={money.format(totals.retentionCreditsAvailable)} detail="Actuales más saldo anterior" tone="violet" /><Metric icon={Calculator} label="Resultado a pagar" value={money.format(totals.taxPayable)} detail={totals.taxPayable > 0 ? "Antes de presentación" : "Sin impuesto a pagar"} tone="emerald" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Secuencia de determinación</h2><p className="mt-1 text-sm text-stone-500">Separa la actividad del período, los saldos recibidos y lo que se trasladará al siguiente expediente.</p></header><div className="space-y-0 px-5">
        <GroupTitle number="1" title="Actividad del período" /><Line label="Débito fiscal de ventas gravadas" value={money.format(totals.debitTax)} detail={`Base gravada ${money.format(totals.taxableBase)}`} /><Line label="Crédito fiscal de compras seleccionadas" value={`(${money.format(totals.purchaseTaxCredit)})`} />{totals.prorationFactor !== null && <><Line label="Factor de prorrateo" value={`${number.format(totals.prorationFactor * 100)} %`} detail="Ventas gravadas ÷ ventas gravadas y exentas" /><Line label="Crédito fiscal deducible" value={`(${money.format(totals.deductibleTaxCredit)})`} /></>}
        <GroupTitle number="2" title="Saldos a favor recibidos" /><EditableLine label="Crédito fiscal de períodos anteriores" value={`(${money.format(totals.previousFiscalCredit)})`} detail="Resultado cerrado del período anterior" editableValue={customPreviousFiscalCredit} onSave={setCustomPreviousFiscalCredit} closed={closed} /><EditableLine label="Retenciones acumuladas anteriores" value={`(${money.format(totals.previousRetentionCredit)})`} detail="Saldo no consumido en la declaración anterior" editableValue={customPreviousRetentionCredit} onSave={setCustomPreviousRetentionCredit} closed={closed} /><Line label="Retenciones seleccionadas en este expediente" value={`(${money.format(totals.currentRetentionCredit)})`} detail="Solo se consumirán al cerrar" />
        <GroupTitle number="3" title="Resultado de esta declaración" /><Line strong label="Impuesto determinado a pagar" value={money.format(totals.taxPayable)} /><Line label="Crédito fiscal para el próximo período" value={money.format(totals.fiscalCreditCarryforward)} detail="Se trasladará al cerrar" /><Line label="Retenciones para el próximo período" value={money.format(totals.retentionCreditCarryforward)} detail="Se trasladarán al cerrar" />
      </div></section>
      <aside className="space-y-4"><section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="font-semibold">Composición de ventas</p><div className="mt-4 space-y-3"><Progress label="Gravadas" total={totals.taxableBase + totals.exemptAmount + totals.nonTaxableAmount} value={totals.taxableBase} tone="emerald" /><Progress label="Exentas / exoneradas" total={totals.taxableBase + totals.exemptAmount + totals.nonTaxableAmount} value={totals.exemptAmount} tone="amber" /><Progress label="No sujetas" total={totals.taxableBase + totals.exemptAmount + totals.nonTaxableAmount} value={totals.nonTaxableAmount} tone="stone" /></div>{totals.prorationFactor !== null && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Hay operaciones gravadas y exentas. La plantilla aplica prorrateo al crédito de compras; valida la fuente y vigencia antes del cierre.</p>}</section><section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="font-semibold">Continuar el expediente</p><div className="mt-3 grid gap-2"><Button className="justify-between" onClick={() => onGo("purchases")} variant="outline">Revisar compras <ShoppingCart /></Button><Button className="justify-between" onClick={() => onGo("retentions")} variant="outline">Revisar retenciones <ShieldCheck /></Button><Button className="justify-between" onClick={() => onGo("seniatForm")} variant="outline">Guía SENIAT (Forma 99030) <ReceiptText /></Button><Button className="justify-between" onClick={() => onGo("closing")} variant="outline">Registrar presentación <FileCheck2 /></Button></div></section><section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"><p className="font-semibold">Regla aplicada · versión {data.case.ruleVersion}</p><p className="mt-1">{data.case.source || "La configuración no tiene una fuente visible en este expediente. Valídala antes de presentar."}</p></section></aside>
    </div>
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Correspondencia con la Forma IVA 99030</h2><p className="mt-1 text-sm text-stone-500">Lectura operativa basada en la planilla SENIAT aportada. Los números permiten conciliar la determinación antes de presentar.</p></header><div className="grid sm:grid-cols-2 lg:grid-cols-4"><FormItem item="49" label="Total débitos fiscales" value={totals.debitTax} /><FormItem item="39" label="Total créditos fiscales" value={totals.fiscalCreditsAvailable} /><FormItem item="53" label="Cuota tributaria" value={totals.taxBeforeRetentions} /><FormItem item="60" label="Excedente fiscal siguiente" value={totals.fiscalCreditCarryforward} /><FormItem item="74" label="Total retenciones" value={totals.retentionCreditsAvailable} /><FormItem item="55" label="Retenciones descontadas" value={Math.min(totals.taxBeforeRetentions, totals.retentionCreditsAvailable)} /><FormItem item="67" label="Retenciones no aplicadas" value={totals.retentionCreditCarryforward} /><FormItem item="90" label="Total a pagar" value={totals.taxPayable} strong /></div></section>
  </section>;
}

function SalesTab({ sales, totals }: { sales: Sale[]; totals: Totals }) {
  return <section className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Ventas del período de imposición</h2><p className="mt-1 text-sm text-stone-500">Todas las ventas registradas en el período se consolidan automáticamente en la determinación.</p></div><div className="text-right"><p className="text-xs text-stone-500">Débito fiscal</p><p className="mt-1 font-semibold text-[#14352d] dark:text-emerald-200">{money.format(totals.debitTax)}</p></div></header><div className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="px-5">Cliente / documento</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Gravada</TableHead><TableHead className="text-right">Exenta</TableHead><TableHead className="text-right">No sujeta</TableHead><TableHead className="text-right">IVA</TableHead><TableHead className="px-5 text-right">Total</TableHead></TableRow></TableHeader><TableBody>{sales.map((item) => <TableRow key={item.id}><TableCell className="px-5"><p className="font-medium">{item.customer}</p><p className="text-xs text-stone-500">{item.documentNumber} · {item.rif || "Sin RIF"}</p></TableCell><TableCell>{displayDate(item.date)}</TableCell><TableCell className="text-right tabular-nums">{money.format(amount(item.taxableBase))}</TableCell><TableCell className="text-right tabular-nums">{money.format(amount(item.exemptAmount))}</TableCell><TableCell className="text-right tabular-nums">{money.format(amount(item.nonTaxableAmount))}</TableCell><TableCell className="text-right font-medium tabular-nums">{money.format(amount(item.taxAmount))}</TableCell><TableCell className="px-5 text-right tabular-nums">{money.format(amount(item.totalAmount))}</TableCell></TableRow>)}{sales.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={7}>No hay ventas registradas para este período. La declaración se tratará sin actividad comercial mientras no se carguen documentos.</TableCell></TableRow>}</TableBody></Table></div></section>;
}

function PurchasesTab({ closed, data, selected, setSelected, toggle, totals, allSelected }: { closed: boolean; data: Workspace; selected: Set<string>; setSelected: React.Dispatch<React.SetStateAction<Set<string>>>; toggle: (id: string) => void; totals: Totals; allSelected: boolean }) {
  const selectedPurchaseItems = data.purchases.filter((item) => selected.has(item.id));
  const totalSelectedPurchasesAmount = selectedPurchaseItems.reduce((sum, item) => sum + amount(item.totalAmount), 0);
  const totalSelectedNoCreditAmount = selectedPurchaseItems.reduce((sum, item) => {
    const isCreditable = item.hasVatCredit ?? (item.vatCreditStatus === "PENDING" && amount(item.taxAmount) > 0);
    return sum + (isCreditable ? (amount(item.exemptAmount) + amount(item.nonTaxableAmount)) : amount(item.totalAmount));
  }, 0);

  return (
    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <header className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">Compras del período (Con y sin derecho a crédito)</h2>
            <p className="mt-1 max-w-3xl text-sm text-stone-500">
              Muestra todas las compras del período. Las compras sin derecho a crédito fiscal o exentas no generan IVA deducible pero se consolidan para reportar el total de compras del período (Casilla 30 SENIAT).
            </p>
          </div>
          {!closed && data.purchases.length > 0 && (
            <Button onClick={() => setSelected(allSelected ? new Set() : new Set(data.purchases.map(({ id }) => id)))} size="sm" variant="outline">
              {allSelected ? "Desmarcar todas" : "Marcar todas"}
            </Button>
          )}
        </header>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/70">
              <TableRow>
                <TableHead className="w-12 px-5">
                  <input aria-label="Seleccionar todas las compras" checked={allSelected} disabled={closed || !data.purchases.length} onChange={() => setSelected(allSelected ? new Set() : new Set(data.purchases.map(({ id }) => id)))} type="checkbox" />
                </TableHead>
                <TableHead>Proveedor / documento</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Condición / Crédito</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="px-5 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.purchases.map((item) => {
                const isCreditable = item.hasVatCredit ?? (item.vatCreditStatus === "PENDING" && amount(item.taxAmount) > 0);
                const isExcluded = item.vatCreditStatus === "EXCLUDED" || item.hasVatCredit === false;
                const isExempt = !isExcluded && (amount(item.taxAmount) === 0 || amount(item.exemptAmount) > 0);
                return (
                  <TableRow className={selected.has(item.id) ? "bg-emerald-50/40 dark:bg-emerald-950/15" : ""} key={item.id}>
                    <TableCell className="px-5">
                      <input aria-label={`Aprovechar compra ${item.documentNumber}`} checked={selected.has(item.id)} disabled={closed} onChange={() => toggle(item.id)} type="checkbox" />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{item.supplier}</p>
                      <p className="text-xs text-stone-500">{item.documentNumber} · {item.rif || "Sin RIF"}</p>
                    </TableCell>
                    <TableCell>
                      <p>{displayDate(item.date)}</p>
                      <p className="text-xs text-stone-500">Período {item.originPeriod}</p>
                    </TableCell>
                    <TableCell>
                      {isExcluded ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Sin derecho a crédito
                        </span>
                      ) : isExempt ? (
                        <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          Exenta / Exonerada
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Con crédito fiscal
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money.format(amount(item.taxableBase))}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money.format(isCreditable ? amount(item.taxAmount) : 0)}</TableCell>
                    <TableCell className="px-5 text-right tabular-nums">{money.format(amount(item.totalAmount))}</TableCell>
                  </TableRow>
                );
              })}
              {data.purchases.length === 0 && (
                <TableRow>
                  <TableCell className="py-12 text-center text-stone-500" colSpan={7}>
                    No hay compras registradas para este período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <p className="font-semibold">Resumen de Compras</p>
        <p className="mt-1 text-sm text-stone-500">{selected.size} de {data.purchases.length} compras seleccionadas</p>
        <div className="mt-4 border-y border-stone-100 py-2 dark:border-stone-800">
          <Line label="Total monto compras" value={money.format(totalSelectedPurchasesAmount)} />
          <Line label="Compras sin crédito / exentas" value={money.format(totalSelectedNoCreditAmount)} detail="Casilla 30 SENIAT" />
          <Line label="Crédito IVA computable" value={money.format(totals.purchaseTaxCredit)} detail="Casilla 34 SENIAT" />
          <Line label="Crédito fiscal deducible" value={money.format(totals.deductibleTaxCredit)} detail={totals.prorationFactor === null ? "Sin prorrateo" : `Factor ${number.format(totals.prorationFactor * 100)} %`} />
        </div>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          Al declarar, las compras marcadas quedan registradas para el período e integradas en la Forma IVA 99030 y Libros Fiscales.
        </p>
      </aside>
    </section>
  );
}

function RetentionsTab({ closed, data, selected, setSelected, toggle, totals, allSelected }: { closed: boolean; data: Workspace; selected: Set<string>; setSelected: React.Dispatch<React.SetStateAction<Set<string>>>; toggle: (id: string) => void; totals: Totals; allSelected: boolean }) {
  return <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="flex flex-col gap-3 border-b border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">Retenciones de IVA recibidas</h2><p className="mt-1 max-w-3xl text-sm text-stone-500">Retenciones cargadas en facturas de venta y aún no consumidas. Puedes reservarlas ahora o dejarlas disponibles para otro período.</p></div>{!closed && data.retentions.length > 0 && <Button onClick={() => setSelected(allSelected ? new Set() : new Set(data.retentions.map(({ id }) => id)))} size="sm" variant="outline">{allSelected ? "Desmarcar todas" : "Marcar todas"}</Button>}</header><div className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/70"><TableRow><TableHead className="w-12 px-5"><input aria-label="Seleccionar todas las retenciones" checked={allSelected} disabled={closed || !data.retentions.length} onChange={() => setSelected(allSelected ? new Set() : new Set(data.retentions.map(({ id }) => id)))} type="checkbox" /></TableHead><TableHead>Cliente / factura</TableHead><TableHead>Comprobante</TableHead><TableHead>Soporte</TableHead><TableHead className="text-right">%</TableHead><TableHead className="px-5 text-right">Retenido</TableHead></TableRow></TableHeader><TableBody>{data.retentions.map((item) => <TableRow className={selected.has(item.id) ? "bg-violet-50/40 dark:bg-violet-950/15" : ""} key={item.id}><TableCell className="px-5"><input aria-label={`Aplicar retención ${item.receiptNumber}`} checked={selected.has(item.id)} disabled={closed} onChange={() => toggle(item.id)} type="checkbox" /></TableCell><TableCell><p className="font-medium">{item.customer}</p><p className="text-xs text-stone-500">Factura {item.invoiceNumber} · {item.rif || "Sin RIF"}</p></TableCell><TableCell><p className="font-medium">{item.receiptNumber}</p><p className="text-xs text-stone-500">{displayDate(item.date)}</p></TableCell><TableCell>{item.voucher ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><BadgeCheck size={14} /> Comprobante cargado</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"><FileClock size={14} /> Sin comprobante</span>}</TableCell><TableCell className="text-right tabular-nums">{item.percentage ? `${number.format(amount(item.percentage))} %` : "—"}</TableCell><TableCell className="px-5 text-right font-medium tabular-nums">{money.format(amount(item.amount))}</TableCell></TableRow>)}{data.retentions.length === 0 && <TableRow><TableCell className="py-12 text-center text-stone-500" colSpan={6}>No hay retenciones de IVA disponibles.</TableCell></TableRow>}</TableBody></Table></div></div><aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="font-semibold">Retenciones aplicadas</p><p className="mt-1 text-sm text-stone-500">{selected.size} de {data.retentions.length} seleccionadas</p><div className="mt-4 border-y border-stone-100 py-2 dark:border-stone-800"><Line label="Saldo anterior" value={money.format(totals.previousRetentionCredit)} /><Line label="Selección actual" value={money.format(totals.currentRetentionCredit)} /><Line label="Disponible total" value={money.format(totals.retentionCreditsAvailable)} /></div><p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Puedes guardar una retención sin comprobante en el borrador, pero el cierre exigirá el soporte para aprovecharla.</p></aside></section>;
}

function BooksTab({ closed, data, selectedPurchases }: { closed: boolean; data: Workspace; selectedPurchases: Set<string> }) {
  const [book, setBook] = useState<"SALES" | "PURCHASES">("SALES");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const snapshot = useMemo(() => closed && data.fiscalBookSnapshot ? data.fiscalBookSnapshot : buildIvaFiscalBookSnapshot({
    generatedAt: data.declaration.determinedAt ?? new Date().toISOString(),
    period: data.declaration.period,
    periodLabel: data.declaration.periodLabel,
    company: {
      legalName: data.company.legalName,
      rif: data.company.rif,
      fiscalAddress: data.company.fiscalAddress ?? "",
    },
    source: { ruleSource: data.case.source, ruleVersion: data.case.ruleVersion },
    sales: data.sales.map((item) => ({
      id: item.id,
      date: item.date,
      partyName: item.customer,
      rif: item.rif,
      documentNumber: item.documentNumber,
      taxableBase: amount(item.taxableBase),
      exemptAmount: amount(item.exemptAmount),
      nonTaxableAmount: amount(item.nonTaxableAmount),
      taxAmount: amount(item.taxAmount),
      totalAmount: amount(item.totalAmount),
      vatRate: amount(item.vatRate),
      taxRateName: item.taxRateName,
      retentions: item.retentions.map((retention) => ({
        receiptNumber: retention.receiptNumber,
        percentage: amount(retention.percentage),
        amount: amount(retention.amount),
      })),
    })),
    purchases: data.purchases.filter(({ id }) => selectedPurchases.has(id)).map((item) => ({
      id: item.id,
      date: item.date,
      partyName: item.supplier,
      rif: item.rif,
      documentNumber: item.documentNumber,
      taxableBase: amount(item.taxableBase),
      exemptAmount: amount(item.exemptAmount),
      nonTaxableAmount: amount(item.nonTaxableAmount),
      taxAmount: amount(item.taxAmount),
      totalAmount: amount(item.totalAmount),
      vatRate: amount(item.vatRate),
      taxRateName: item.taxRateName,
      retentions: item.retentions.map((retention) => ({
        receiptNumber: retention.receiptNumber,
        percentage: amount(retention.percentage),
        amount: amount(retention.amount),
      })),
    })),
  }), [closed, data, selectedPurchases]);

  async function download(format: "pdf" | "xlsx") {
    setExporting(format);
    setDownloadError("");
    try {
      const response = await fetch("/api/declarations/iva/books", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          period: data.declaration.period,
          kind: book,
          format,
          selectedPurchaseIds: [...selectedPurchases],
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "No fue posible generar el libro fiscal.");
      }
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? `libro-iva.${format}`;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : "No fue posible generar el libro fiscal.");
    } finally {
      setExporting(null);
    }
  }

  const rows = book === "SALES" ? snapshot.sales : snapshot.purchases;
  return <section className="mt-6 space-y-5">
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="flex flex-col gap-4 border-b border-stone-100 p-5 dark:border-stone-800 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><BookOpen size={18} /></span><div><h2 className="font-semibold">Vista preliminar de libros fiscales</h2><p className="mt-1 max-w-3xl text-sm text-stone-500">{closed ? "Esta es la instantánea congelada al cerrar la declaración." : "Se actualiza con las ventas del período y las compras seleccionadas en la determinación."}</p></div></div>
        <div className="flex flex-wrap gap-2"><Button disabled={exporting !== null} onClick={() => void download("pdf")} size="sm" variant="outline">{exporting === "pdf" ? <LoaderCircle className="animate-spin" /> : <FileText />} PDF</Button><Button disabled={exporting !== null} onClick={() => void download("xlsx")} size="sm" variant="outline">{exporting === "xlsx" ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />} Excel</Button></div>
      </header>
      <div className="flex gap-1 border-b border-stone-100 px-5 pt-3 dark:border-stone-800"><button className={`border-b-2 px-3 py-2 text-sm font-medium ${book === "SALES" ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500"}`} onClick={() => setBook("SALES")} type="button">Libro de ventas ({snapshot.sales.length})</button><button className={`border-b-2 px-3 py-2 text-sm font-medium ${book === "PURCHASES" ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500"}`} onClick={() => setBook("PURCHASES")} type="button">Libro de compras ({snapshot.purchases.length})</button></div>
      <div className="border-b border-stone-100 bg-stone-50 px-5 py-4 text-center dark:border-stone-800 dark:bg-stone-800/50"><p className="font-semibold">{data.company.legalName}</p><p className="mt-1 text-xs text-stone-500">RIF {data.company.rif} · {data.company.fiscalAddress || "Dirección fiscal no registrada"}</p><p className="mt-3 text-sm font-semibold">{book === "SALES" ? "LIBRO DE VENTAS" : "LIBRO DE COMPRAS"}</p><p className="mt-0.5 text-xs uppercase text-stone-500">Correspondiente a {data.declaration.periodLabel}</p></div>
      {book === "SALES" ? <SalesBookPreview rows={snapshot.sales} /> : <PurchasesBookPreview rows={snapshot.purchases} />}
      {!rows.length && <div className="border-t border-stone-100 p-8 text-center text-sm text-stone-500 dark:border-stone-800">No hay documentos incluidos en este libro.</div>}
    </section>
    {downloadError && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950"><AlertCircle className="mt-0.5 shrink-0" size={16} />{downloadError}</div>}
    <BookSummary snapshot={snapshot} />
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-semibold">Validaciones antes del cierre</p><ul className="mt-2 list-disc space-y-1 pl-5">{snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-2">Referencia documental: {snapshot.source.model}. La fuente configurada para este expediente sigue siendo la regla v{snapshot.source.ruleVersion}: {snapshot.source.ruleSource || "sin fuente visible"}.</p></div>
  </section>;
}

function SalesBookPreview({ rows }: { rows: ReturnType<typeof buildIvaFiscalBookSnapshot>["sales"] }) {
  if (!rows.length) return null;
  return <div className="overflow-x-auto"><Table className="min-w-[1900px]"><TableHeader className="bg-sky-100 text-[11px] text-stone-700 dark:bg-sky-950 dark:text-stone-200"><TableRow><TableHead className="px-4">N°</TableHead><TableHead>Fecha</TableHead><TableHead>RIF / comprador</TableHead><TableHead>Factura / control</TableHead><TableHead>Notas débito / crédito</TableHead><TableHead>Comprobante retención</TableHead><TableHead>Factura afectada</TableHead><TableHead className="text-right">Total con IVA</TableHead><TableHead className="text-right">Exentas</TableHead><TableHead className="text-right">Exoneradas</TableHead><TableHead className="text-right">No sujetas</TableHead><TableHead className="text-right">Exportación</TableHead><TableHead className="text-right">General base / % / IVA</TableHead><TableHead className="text-right">Reducida base / % / IVA</TableHead><TableHead>SPE</TableHead><TableHead className="px-4 text-right">Retención % / IVA</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.operation}><TableCell className="px-4">{row.operation}</TableCell><TableCell>{displayDate(row.date)}</TableCell><TableCell><p className="font-medium">{row.partyName}</p><p className="text-xs text-stone-500">{row.rif || "Sin RIF"}</p></TableCell><TableCell><p>{row.invoiceNumber || "—"}</p><p className="text-xs text-stone-500">Control {row.controlNumber || "—"}</p></TableCell><TableCell>{row.debitNoteNumber || "—"} / {row.creditNoteNumber || "—"}</TableCell><TableCell>{row.retentionReceiptNumber || "—"}</TableCell><TableCell>{row.affectedInvoiceNumber || "—"}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.totalAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.exemptAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.exoneratedAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.nonTaxableAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.exportSales.base)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.generalSales.base)} / {number.format(row.generalSales.rate)} % / {number.format(row.generalSales.tax)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.reducedSales.base)} / {number.format(row.reducedSales.rate)} % / {number.format(row.reducedSales.tax)}</TableCell><TableCell>{row.specialTaxpayer}</TableCell><TableCell className="px-4 text-right tabular-nums">{number.format(row.retentionPercentage)} % / {number.format(row.retainedVat)}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function PurchasesBookPreview({ rows }: { rows: ReturnType<typeof buildIvaFiscalBookSnapshot>["purchases"] }) {
  if (!rows.length) return null;
  return <div className="overflow-x-auto"><Table className="min-w-[2200px]"><TableHeader className="bg-sky-100 text-[11px] text-stone-700 dark:bg-sky-950 dark:text-stone-200"><TableRow><TableHead className="px-4">N°</TableHead><TableHead>Fecha</TableHead><TableHead>RIF / proveedor</TableHead><TableHead>Factura</TableHead><TableHead>Notas débito / crédito</TableHead><TableHead>Planilla importación</TableHead><TableHead>Comprobante retención</TableHead><TableHead>Factura afectada</TableHead><TableHead className="text-right">Total con IVA</TableHead><TableHead className="text-right">Exentas</TableHead><TableHead className="text-right">Exoneradas</TableHead><TableHead className="text-right">No sujetas</TableHead><TableHead className="text-right">Sin derecho a crédito</TableHead><TableHead className="text-right">Importación general</TableHead><TableHead className="text-right">Importación reducida</TableHead><TableHead className="text-right">Nacional general base / % / IVA</TableHead><TableHead className="text-right">Nacional reducida base / % / IVA</TableHead><TableHead>SPE</TableHead><TableHead className="px-4 text-right">Retención % / IVA</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.operation}><TableCell className="px-4">{row.operation}</TableCell><TableCell>{displayDate(row.date)}</TableCell><TableCell><p className="font-medium">{row.partyName}</p><p className="text-xs text-stone-500">{row.rif || "Sin RIF"}</p></TableCell><TableCell>{row.invoiceNumber || "—"}</TableCell><TableCell>{row.debitNoteNumber || "—"} / {row.creditNoteNumber || "—"}</TableCell><TableCell>{row.importFormNumber || "—"}</TableCell><TableCell>{row.retentionReceiptNumber || "—"}</TableCell><TableCell>{row.affectedInvoiceNumber || "—"}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.totalAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.exemptAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.exoneratedAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.nonTaxableAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.noCreditAmount)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.importGeneral.base)} / {number.format(row.importGeneral.tax)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.importReduced.base)} / {number.format(row.importReduced.tax)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.nationalGeneral.base)} / {number.format(row.nationalGeneral.rate)} % / {number.format(row.nationalGeneral.tax)}</TableCell><TableCell className="text-right tabular-nums">{number.format(row.nationalReduced.base)} / {number.format(row.nationalReduced.rate)} % / {number.format(row.nationalReduced.tax)}</TableCell><TableCell>{row.specialTaxpayer}</TableCell><TableCell className="px-4 text-right tabular-nums">{number.format(row.retentionPercentage)} % / {number.format(row.retainedVat)}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function BookSummary({ snapshot }: { snapshot: ReturnType<typeof buildIvaFiscalBookSnapshot> }) {
  const sales = snapshot.summary.sales;
  const purchases = snapshot.summary.purchases;
  const debitRows = [["Ventas gravadas · alícuota general", sales.general.base, sales.general.tax], ["Ventas gravadas · alícuota reducida", sales.reduced.base, sales.reduced.tax], ["Ventas gravadas · general más adicional", sales.additional.base, sales.additional.tax], ["Ventas internas no gravadas", sales.exemptAmount + sales.exoneratedAmount + sales.nonTaxableAmount, 0], ["Ventas de exportación", sales.exportAmount, 0], ["Total ventas y débitos fiscales", sales.totalBase, sales.totalDebit]] as const;
  const creditRows = [["Compras no gravadas / sin derecho", purchases.noCreditAmount, 0], ["Compras nacionales exentas", purchases.exemptAmount, 0], ["Compras nacionales exoneradas", purchases.exoneratedAmount, 0], ["Compras nacionales no sujetas", purchases.nonTaxableAmount, 0], ["Compras nacionales · alícuota general", purchases.nationalGeneral.base, purchases.nationalGeneral.tax], ["Compras nacionales · alícuota reducida", purchases.nationalReduced.base, purchases.nationalReduced.tax], ["Total compras y créditos fiscales", purchases.totalBase, purchases.totalCredit]] as const;
  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="bg-sky-100 px-5 py-3 text-center text-sm font-semibold dark:bg-sky-950">Resumen del período de imposición</header><div className="grid lg:grid-cols-2"><SummaryTable heading="Resumen de débitos fiscales" rows={debitRows} /><SummaryTable heading="Resumen de créditos fiscales" rows={creditRows} /></div></section>;
}

function SummaryTable({ heading, rows }: { heading: string; rows: ReadonlyArray<readonly [string, number, number]> }) {
  return <div className="overflow-x-auto border-stone-200 first:border-b dark:border-stone-800 lg:first:border-b-0 lg:first:border-r"><Table><TableHeader><TableRow><TableHead className="px-5">{heading}</TableHead><TableHead className="text-right">Base imponible</TableHead><TableHead className="px-5 text-right">{heading.includes("débitos") ? "Débito fiscal" : "Crédito fiscal"}</TableHead></TableRow></TableHeader><TableBody>{rows.map(([label, base, tax], index) => <TableRow className={index === rows.length - 1 ? "bg-sky-50 font-semibold dark:bg-sky-950/40" : ""} key={label}><TableCell className="px-5">{label}</TableCell><TableCell className="text-right tabular-nums">{number.format(base)}</TableCell><TableCell className="px-5 text-right tabular-nums">{number.format(tax)}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function ClosingTab({ closed, confirmDifference, data, declaredAmount, filedAt, hasDifference, onAmount, onConfirmDifference, onDate, onUpload, onClose, saving, totals, uploading }: { closed: boolean; confirmDifference: boolean; data: Workspace; declaredAmount: string; filedAt: string; hasDifference: boolean; onAmount: (value: string) => void; onConfirmDifference: (value: boolean) => void; onDate: (value: string) => void; onUpload: (kind: EvidenceKind, file: File | null) => Promise<void>; onClose: () => void; saving: boolean; totals: Totals; uploading: EvidenceKind | null }) {
  const evidenceByKind = new Map(data.case.evidences.map((item) => [item.kind, item]));
  return <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"><div className="space-y-5"><section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><h2 className="font-semibold">Datos presentados en SENIAT</h2><p className="mt-1 text-sm text-stone-500">Registra exactamente la fecha y el monto de la declaración presentada, aunque difieran de la determinación interna.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Fecha de presentación<DatePicker className="field mt-1.5" disabled={closed} onValueChange={onDate} value={filedAt} /></label><label className="text-sm font-medium">Monto declarado en SENIAT<Input className="field mt-1.5" disabled={closed} inputMode="decimal" onChange={(event) => onAmount(event.target.value)} placeholder={String(totals.taxPayable.toFixed(2))} value={declaredAmount} /></label></div>{hasDifference && !closed && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><input checked={confirmDifference} className="mt-0.5 size-4" onChange={(event) => onConfirmDifference(event.target.checked)} type="checkbox" /><span><b>Confirmar diferencia con la determinación</b><span className="mt-1 block text-xs leading-5">El monto presentado no coincide con {money.format(totals.taxPayable)}. La diferencia quedará visible en el expediente.</span></span></label>}</section><section className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"><header className="border-b border-stone-100 p-5 dark:border-stone-800"><h2 className="font-semibold">Soportes configurados</h2><p className="mt-1 text-sm text-stone-500">La lista proviene de Configuración de impuestos de la firma y se archiva en este expediente.</p></header><div className="grid gap-4 p-5 sm:grid-cols-2">{data.case.requirements.map((requirement) => { const evidence = evidenceByKind.get(requirement.kind); const paymentEvidence = ["PAYMENT_FORM", "PAYMENT_RECEIPT"].includes(requirement.kind); const requiredNow = requirement.required && !paymentEvidence; return <div key={requirement.kind}><div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-medium">{requirement.label}</p><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${requiredNow ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>{requiredNow ? "Obligatorio" : paymentEvidence ? "Se adjunta al pagar" : "Opcional"}</span></div><AttachmentInput accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" aria-label={`Adjuntar ${requirement.label}`} disabled={closed || uploading !== null} fileName={evidence?.name ?? ""} label={uploading === requirement.kind ? "Cargando soporte…" : `Adjuntar ${requirement.label.toLocaleLowerCase("es")}`} onChange={(event) => void onUpload(requirement.kind, event.target.files?.[0] ?? null)} /></div>; })}{data.case.requirements.length === 0 && <p className="text-sm text-stone-500 sm:col-span-2">Este impuesto no tiene soportes habilitados. Configúralos en la firma antes de declarar.</p>}</div></section></div><aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"><p className="font-semibold">Conciliación final</p><div className="mt-4 border-y border-stone-100 py-2 dark:border-stone-800"><Line label="Determinado por el sistema" value={money.format(totals.taxPayable)} /><Line label="Declarado en SENIAT" value={money.format(declaredAmount ? amount(declaredAmount.replace(",", ".")) : totals.taxPayable)} /><Line label="Diferencia" value={money.format((declaredAmount ? amount(declaredAmount.replace(",", ".")) : totals.taxPayable) - totals.taxPayable)} /></div>{!closed ? <Button className="mt-5 w-full bg-[#14352d] text-white hover:bg-[#0e2821]" disabled={saving || !data.canManage || !filedAt || (hasDifference && !confirmDifference)} onClick={onClose}>{saving ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />} {saving ? "Declarando…" : "Declarar y generar compromiso"}</Button> : <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><CircleCheck className="mr-1 inline" size={16} /> Declarada el {displayDate(data.declaration.filedAt)}<Link className="mt-2 block font-semibold underline underline-offset-2" href="/compromisos-de-pago">Ir a Compromisos de pago</Link></div>}<p className="mt-3 text-xs leading-5 text-stone-500">Al declarar se bloquean los documentos seleccionados y los saldos remanentes quedan disponibles para el período siguiente. El pago se registra desde Compromisos.</p></aside></section>;
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Calculator; label: string; value: string; detail: string; tone: "stone" | "sky" | "violet" | "emerald" }) { const colors = { stone: "bg-stone-100 text-stone-600 dark:bg-stone-800", sky: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300", violet: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300", emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" }; return <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"><div className={`grid size-8 place-items-center rounded-lg ${colors[tone]}`}><Icon size={16} /></div><p className="mt-3 text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></div>; }
function FormItem({ item, label, value, strong = false }: { item: string; label: string; value: number; strong?: boolean }) { return <div className={`border-b border-stone-100 p-4 dark:border-stone-800 sm:border-r ${strong ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}><div className="flex items-center justify-between gap-3"><span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">Ítem {item}</span><span className={`tabular-nums ${strong ? "font-semibold text-emerald-800 dark:text-emerald-200" : "font-medium"}`}>{money.format(value)}</span></div><p className="mt-2 text-xs text-stone-500">{label}</p></div>; }
function Line({ label, value, detail, strong = false }: { label: string; value: string; detail?: string; strong?: boolean }) { return <div className={`flex items-start justify-between gap-5 py-3 ${strong ? "text-base font-semibold" : "text-sm"}`}><div><p>{label}</p>{detail && <p className="mt-1 text-xs font-normal text-stone-500">{detail}</p>}</div><p className="shrink-0 text-right font-medium tabular-nums">{value}</p></div>; }
function GroupTitle({ number: value, title }: { number: string; title: string }) { return <div className="mt-2 flex items-center gap-2 border-b border-stone-100 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 first:mt-0 dark:border-stone-800"><span className="grid size-5 place-items-center rounded-full bg-stone-100 text-[10px] text-stone-600 dark:bg-stone-800 dark:text-stone-300">{value}</span>{title}</div>; }
function Progress({ label, total, value, tone }: { label: string; total: number; value: number; tone: "emerald" | "amber" | "stone" }) { const width = total > 0 ? Math.min(100, value / total * 100) : 0; const color = { emerald: "bg-emerald-600", amber: "bg-amber-500", stone: "bg-stone-400" }[tone]; return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span>{label}</span><span className="font-medium tabular-nums">{money.format(value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} /></div></div>; }
function Workflow({ number: value, label, detail, done = false }: { number: string; label: string; detail: string; done?: boolean }) { return <div className="flex items-start gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-[#14352d] text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-800"}`}>{done ? <Check size={14} /> : value}</span><div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs text-stone-500">{detail}</p></div></div>; }
function StatusBadge({ status }: { status: Status }) { const color = ["SUBMITTED", "PAID", "CLOSED"].includes(status) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : status === "READY_FOR_REVIEW" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>; }
function State({ icon: Icon, title, description, action, spin = false }: { icon: typeof ReceiptText; title: string; description: string; action?: React.ReactNode; spin?: boolean }) { return <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-900"><Icon className={`mx-auto text-stone-400 ${spin ? "animate-spin" : ""}`} size={28} /><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-xl text-sm text-stone-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>; }

function SeniatFormTab({ data, selectedPurchases, totals }: { data: Workspace; selectedPurchases: Set<string>; totals: Totals }) {
  const selectedPurchaseItems = data.purchases.filter((item) => selectedPurchases.has(item.id));

  const noCreditPurchasesBase = selectedPurchaseItems.reduce((sum, item) => {
    const isCreditable = item.hasVatCredit ?? (item.vatCreditStatus === "PENDING" && amount(item.taxAmount) > 0);
    return sum + (isCreditable ? (amount(item.exemptAmount) + amount(item.nonTaxableAmount)) : amount(item.totalAmount));
  }, 0);

  const creditablePurchasesBase = selectedPurchaseItems.reduce((sum, item) => {
    const isCreditable = item.hasVatCredit ?? (item.vatCreditStatus === "PENDING" && amount(item.taxAmount) > 0);
    return sum + (isCreditable ? amount(item.taxableBase) : 0);
  }, 0);

  const totalPurchasesBase = noCreditPurchasesBase + creditablePurchasesBase;
  const nonTaxableSalesBase = data.sales.reduce((sum, item) => sum + amount(item.exemptAmount) + amount(item.nonTaxableAmount), 0);

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#14352d] text-xs font-bold text-white">
              SENIAT
            </div>
            <div>
              <h2 className="font-bold text-stone-900 dark:text-stone-100">FORMA IVA 99030</h2>
              <p className="text-xs text-stone-500">Borrador Guía para la Declaración y Pago del IVA en portal SENIAT</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800">
              <span className="text-stone-500">Período: </span>
              <span className="font-bold">{data.declaration.periodLabel}</span>
            </div>
            <div className="rounded-lg bg-stone-100 px-3 py-1.5 dark:bg-stone-800">
              <span className="text-stone-500">RIF: </span>
              <span className="font-bold">{data.company.rif}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              Imprimir Guía 99030
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="font-semibold">Guía interactiva para la transcripción en el portal del SENIAT</p>
          <p className="mt-0.5">
            Utiliza estos números de casilla al ingresar tu declaración en el portal del SENIAT. Las compras sin derecho a crédito fiscal o exentas han sido consolidadas en el <b>Ítem 10 (Casilla 30)</b>.
          </p>
        </div>

        {/* Sección DÉBITOS FISCALES */}
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="bg-[#14352d] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
            DÉBITOS FISCALES (Ventas e Ingresos del Período)
          </div>
          <Table>
            <TableHeader className="bg-stone-50 text-[11px] dark:bg-stone-800/70">
              <TableRow>
                <TableHead className="w-12 px-4 text-center">N°</TableHead>
                <TableHead>Concepto / Renglón SENIAT</TableHead>
                <TableHead className="w-32 text-center">Casilla Base</TableHead>
                <TableHead className="text-right">Base Imponible</TableHead>
                <TableHead className="w-32 text-center">Casilla Débito</TableHead>
                <TableHead className="px-4 text-right">Débito Fiscal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <SeniatRow num="1" concept="Ventas Internas no Gravadas" boxBase="40" valBase={nonTaxableSalesBase} />
              <SeniatRow num="2" concept="Ventas de Exportación" boxBase="41" valBase={0} />
              <SeniatRow num="3" concept="Ventas Internas Gravadas por Alícuota General" boxBase="42" valBase={totals.taxableBase} boxTax="43" valTax={totals.debitTax} />
              <SeniatRow num="4" concept="Ventas Internas Gravadas por Alícuota General más Adicional" boxBase="442" valBase={0} boxTax="452" valTax={0} />
              <SeniatRow num="5" concept="Ventas Internas Gravadas por Alícuota Reducida" boxBase="443" valBase={0} boxTax="453" valTax={0} />
              <SeniatRow num="6" concept="Total Ventas y Débitos Fiscales para efectos de Determinación" boxBase="46" valBase={totals.taxableBase + nonTaxableSalesBase} boxTax="47" valTax={totals.debitTax} strong />
              <SeniatRow num="7" concept="Ajustes a los Débitos Fiscales de períodos anteriores" boxTax="48" valTax={0} />
              <SeniatRow num="8" concept="Certificados de Débitos Fiscales Exonerados (recibos de entes exonerados)" boxTax="80" valTax={0} />
              <SeniatRow num="9" concept="Total Débitos Fiscales" boxTax="49" valTax={totals.debitTax} highlight />
            </TableBody>
          </Table>
        </div>

        {/* Sección CRÉDITOS FISCALES */}
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="bg-[#14352d] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
            CRÉDITOS FISCALES (Compras y Gastos del Período)
          </div>
          <Table>
            <TableHeader className="bg-stone-50 text-[11px] dark:bg-stone-800/70">
              <TableRow>
                <TableHead className="w-12 px-4 text-center">N°</TableHead>
                <TableHead>Concepto / Renglón SENIAT</TableHead>
                <TableHead className="w-32 text-center">Casilla Base</TableHead>
                <TableHead className="text-right">Base Imponible</TableHead>
                <TableHead className="w-32 text-center">Casilla Crédito</TableHead>
                <TableHead className="px-4 text-right">Crédito Fiscal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <SeniatRow num="10" concept="Compras no Gravadas y/o sin Derecho a Crédito Fiscal" boxBase="30" valBase={noCreditPurchasesBase} note="Incluye compras exentas y compras sin derecho a crédito fiscal (neteadas con su IVA)" badge />
              <SeniatRow num="11" concept="Importaciones Gravadas por Alícuota General" boxBase="31" valBase={0} boxTax="32" valTax={0} />
              <SeniatRow num="12" concept="Importaciones Gravadas por Alícuota General más Adicional" boxBase="312" valBase={0} boxTax="322" valTax={0} />
              <SeniatRow num="13" concept="Importaciones Gravadas por Alícuota Reducida" boxBase="313" valBase={0} boxTax="323" valTax={0} />
              <SeniatRow num="14" concept="Compras Internas Gravadas por Alícuota General" boxBase="33" valBase={creditablePurchasesBase} boxTax="34" valTax={totals.purchaseTaxCredit} />
              <SeniatRow num="15" concept="Compras Internas Gravadas por Alícuota General más Adicional" boxBase="332" valBase={0} boxTax="342" valTax={0} />
              <SeniatRow num="16" concept="Compras Internas Gravadas por Alícuota Reducida" boxBase="333" valBase={0} boxTax="343" valTax={0} />
              <SeniatRow num="17" concept="Total Compras y Créditos Fiscales del Período" boxBase="35" valBase={totalPurchasesBase} boxTax="36" valTax={totals.purchaseTaxCredit} strong />
              <SeniatRow num="18" concept="Créditos Fiscales Totalmente Deducibles" boxTax="70" valTax={totals.deductibleTaxCredit} />
              <SeniatRow num="19" concept="Créditos Fiscales producto de la Aplicación de Prorrata" boxTax="37" valTax={0} />
              <SeniatRow num="20" concept="Total Créditos Fiscales Deducibles (70 + 37)" boxTax="71" valTax={totals.deductibleTaxCredit} />
              <SeniatRow num="21" concept="Excedente Créditos Fiscales del mes Anterior (ítem 60 anterior)" boxTax="20" valTax={totals.previousFiscalCredit} />
              <SeniatRow num="22" concept="Reintegro Solicitado (sólo Exportadores)" boxTax="21" valTax={0} />
              <SeniatRow num="23" concept="Reintegro Solicitado (proveedores a entes exonerados)" boxTax="81" valTax={0} />
              <SeniatRow num="24" concept="Ajustes a los Créditos Fiscales de períodos anteriores" boxTax="38" valTax={0} />
              <SeniatRow num="25" concept="Certificados de Débitos Fiscales Exonerados" boxTax="82" valTax={0} />
              <SeniatRow num="26" concept="Total Créditos Fiscales" boxTax="39" valTax={totals.fiscalCreditsAvailable} highlight />
            </TableBody>
          </Table>
        </div>

        {/* Sección AUTOLIQUIDACIÓN */}
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
          <div className="bg-[#14352d] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
            AUTOLIQUIDACIÓN (Determinación de la Cuota y Retenciones)
          </div>
          <Table>
            <TableHeader className="bg-stone-50 text-[11px] dark:bg-stone-800/70">
              <TableRow>
                <TableHead className="w-12 px-4 text-center">N°</TableHead>
                <TableHead>Concepto / Renglón SENIAT</TableHead>
                <TableHead className="w-32 text-center">Casilla SENIAT</TableHead>
                <TableHead className="px-4 text-right">Monto (VES)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              <SeniatAutoRow num="27" concept="Total Cuota Tributaria del Período" box="53" val={totals.taxBeforeRetentions} strong />
              <SeniatAutoRow num="28" concept="Excedente de Crédito Fiscal para el mes siguiente" box="60" val={totals.fiscalCreditCarryforward} />
              <SeniatAutoRow num="29" concept="Impuesto pagado en Declaración(es) Sustituida(s)" box="22" val={0} />
              <SeniatAutoRow num="30" concept="Retenciones Descontadas en Declaración(es) Sustituida(s)" box="51" val={0} />
              <SeniatAutoRow num="31" concept="Percepciones Descontadas en Declaración(es) Sustituida(s)" box="24" val={0} />
              <SeniatAutoRow num="32" concept="Sub-total Impuesto a Pagar" box="78" val={totals.taxBeforeRetentions} />
              <SeniatAutoRow num="33" concept="Retenciones Acumuladas por Descontar (períodos anteriores)" box="54" val={totals.previousRetentionCredit} />
              <SeniatAutoRow num="34" concept="Retenciones del Período" box="66" val={totals.currentRetentionCredit} />
              <SeniatAutoRow num="35" concept="Créditos Adquiridos por Cesión de Retenciones" box="72" val={0} />
              <SeniatAutoRow num="36" concept="Recuperación de Retenciones Solicitado" box="73" val={0} />
              <SeniatAutoRow num="37" concept="Total Retenciones Disponibles (54 + 66)" box="74" val={totals.retentionCreditsAvailable} strong />
              <SeniatAutoRow num="38" concept="Retenciones Soportadas y Descontadas en esta Declaración" box="55" val={Math.min(totals.taxBeforeRetentions, totals.retentionCreditsAvailable)} />
              <SeniatAutoRow num="39" concept="Saldo de Retenciones de IVA no aplicado (siguiente período)" box="67" val={totals.retentionCreditCarryforward} />
              <SeniatAutoRow num="40" concept="Sub-total Impuesto a Pagar" box="56" val={totals.taxPayable} />
              <SeniatAutoRow num="48" concept="TOTAL A PAGAR" box="90" val={totals.taxPayable} highlight />
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function SeniatRow({ num, concept, boxBase, valBase, boxTax, valTax, strong = false, highlight = false, note, badge }: { num: string; concept: string; boxBase?: string; valBase?: number; boxTax?: string; valTax?: number; strong?: boolean; highlight?: boolean; note?: string; badge?: boolean }) {
  return (
    <TableRow className={`${highlight ? "bg-emerald-100/60 font-bold dark:bg-emerald-950/60" : strong ? "bg-stone-50 font-semibold dark:bg-stone-800/40" : ""}`}>
      <TableCell className="px-4 text-center font-medium text-stone-500">{num}</TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <span>{concept}</span>
          {badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">Sin Crédito / Exentas</span>}
        </div>
        {note && <p className="mt-0.5 text-[11px] text-stone-500">{note}</p>}
      </TableCell>
      <TableCell className="text-center">
        {boxBase ? <span className="inline-block rounded bg-stone-200 px-2 py-0.5 font-mono text-xs font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-200">[{boxBase}]</span> : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">{valBase !== undefined ? money.format(valBase) : "—"}</TableCell>
      <TableCell className="text-center">
        {boxTax ? <span className="inline-block rounded bg-[#14352d] px-2 py-0.5 font-mono text-xs font-bold text-white dark:bg-emerald-900 dark:text-emerald-100">[{boxTax}]</span> : "—"}
      </TableCell>
      <TableCell className="px-4 text-right tabular-nums font-medium">{valTax !== undefined ? money.format(valTax) : "—"}</TableCell>
    </TableRow>
  );
}

function SeniatAutoRow({ num, concept, box, val, strong = false, highlight = false }: { num: string; concept: string; box: string; val: number; strong?: boolean; highlight?: boolean }) {
  return (
    <TableRow className={`${highlight ? "bg-emerald-100/80 font-extrabold text-[#14352d] dark:bg-emerald-950 dark:text-emerald-100" : strong ? "bg-stone-50 font-semibold dark:bg-stone-800/40" : ""}`}>
      <TableCell className="px-4 text-center font-medium text-stone-500">{num}</TableCell>
      <TableCell>{concept}</TableCell>
      <TableCell className="text-center">
        <span className={`inline-block rounded px-2.5 py-0.5 font-mono text-xs font-bold ${highlight ? "bg-[#14352d] text-white dark:bg-emerald-400 dark:text-stone-950" : "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200"}`}>[{box}]</span>
      </TableCell>
      <TableCell className="px-4 text-right tabular-nums font-semibold">{money.format(val)}</TableCell>
    </TableRow>
  );
}

function EditableLine({ label, value, detail, strong = false, editableValue, onSave, closed }: { label: string; value: string; detail?: string; strong?: boolean; editableValue: string; onSave: (val: string) => void; closed: boolean }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(editableValue);

  if (!editing || closed) {
    return <div className={`flex items-start justify-between gap-5 py-3 group ${strong ? "text-base font-semibold" : "text-sm"}`}><div><p>{label}</p>{detail && <p className="mt-1 text-xs font-normal text-stone-500">{detail}</p>}</div><div className="flex items-center gap-2"><p className="shrink-0 text-right font-medium tabular-nums">{value}</p>{!closed && <button onClick={() => { setTemp(editableValue); setEditing(true); }} className="invisible group-hover:visible text-stone-400 hover:text-[#14352d] dark:hover:text-emerald-400"><Pencil size={14} /></button>}</div></div>;
  }

  return <div className={`flex items-center justify-between gap-5 py-2.5 ${strong ? "text-base font-semibold" : "text-sm"}`}><div><p>{label}</p>{detail && <p className="mt-1 text-xs font-normal text-stone-500">{detail}</p>}</div><div className="flex items-center gap-2"><Input type="text" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} className="w-28 text-right h-8" placeholder="0.00" /><Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => { onSave(temp); setEditing(false); }}><Check size={14} /></Button><Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(false)}><X size={14} /></Button></div></div>;
}