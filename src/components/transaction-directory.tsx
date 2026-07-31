"use client";;
import { AttachmentInput } from "@/components/ui/attachment-input";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileUp,
  LockKeyhole,
  MoreHorizontal,
  Paperclip,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

type TransactionKind = "purchase" | "sale";
type DirectoryTab = "invoices" | "retentions";
type RetentionType = "IVA" | "ISLR";

type TransactionRecord = {
  id: number;
  date: string;
  document: string;
  party: string;
  rif: string;
  taxableBase: number;
  tax: number;
  total: number;
  status: "Registrada" | "Pendiente";
};

type RetentionRecord = {
  id: number;
  receipt: string;
  date: string;
  party: string;
  rif: string;
  invoice: string;
  type: RetentionType;
  taxableBase: number;
  invoiceVat: number;
  ivaPercentage?: 75 | 100;
  amount: number;
  voucher?: string;
  status: "Disponible" | "Aplicada";
  appliedTo?: string;
};

const data: Record<TransactionKind, TransactionRecord[]> = {
  purchase: [
    { id: 1, date: "29 jul 2026", document: "F-001245", party: "Distribuidora Nacional de Empaques, C.A.", rif: "J-405699214", taxableBase: 48_000, tax: 7_680, total: 55_680, status: "Registrada" },
    { id: 2, date: "28 jul 2026", document: "F-984512", party: "Insumos Occidente, C.A.", rif: "J-314889623", taxableBase: 12_500, tax: 2_000, total: 14_500, status: "Pendiente" },
  ],
  sale: [
    { id: 1, date: "29 jul 2026", document: "F-000892", party: "Comercializadora San Miguel, C.A.", rif: "J-401256789", taxableBase: 82_000, tax: 13_120, total: 95_120, status: "Registrada" },
    { id: 2, date: "28 jul 2026", document: "F-000891", party: "Alimentos La Montaña, C.A.", rif: "J-308774521", taxableBase: 36_500, tax: 5_840, total: 42_340, status: "Registrada" },
  ],
};

const initialRetentions: RetentionRecord[] = [
  {
    id: 1,
    receipt: "202607000000184",
    date: "30 jul 2026",
    party: "Comercializadora San Miguel, C.A.",
    rif: "J-401256789",
    invoice: "F-000892",
    type: "IVA",
    taxableBase: 82_000,
    invoiceVat: 13_120,
    ivaPercentage: 100,
    amount: 13_120,
    voucher: "comprobante_iva_000184.pdf",
    status: "Disponible",
  },
  {
    id: 2,
    receipt: "202606000000153",
    date: "30 jun 2026",
    party: "Alimentos La Montaña, C.A.",
    rif: "J-308774521",
    invoice: "F-000815",
    type: "IVA",
    taxableBase: 22_000,
    invoiceVat: 3_520,
    ivaPercentage: 75,
    amount: 2_640,
    voucher: "comprobante_iva_000153.pdf",
    status: "Aplicada",
    appliedTo: "Declaración IVA · Junio 2026",
  },
  {
    id: 3,
    receipt: "R-ISLR-000041",
    date: "30 jul 2026",
    party: "Comercializadora San Miguel, C.A.",
    rif: "J-401256789",
    invoice: "F-000892",
    type: "ISLR",
    taxableBase: 82_000,
    invoiceVat: 13_120,
    amount: 820,
    voucher: "comprobante_islr_000041.pdf",
    status: "Disponible",
  },
];

const amountFormat = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function bolivars(value: number) {
  return `Bs. ${amountFormat.format(value)}`;
}

export function TransactionDirectory({ kind }: { kind: TransactionKind }) {
  const isPurchase = kind === "purchase";
  const title = isPurchase ? "Compras" : "Ventas";
  const partyLabel = isPurchase ? "Proveedor" : "Cliente";
  const [tab, setTab] = useState<DirectoryTab>("invoices");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<25 | 50 | "all">(25);
  const [menuOpen, setMenuOpen] = useState(false);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retentions, setRetentions] = useState(initialRetentions);
  const searchParams = useSearchParams();

  const showingRetentions = !isPurchase && tab === "retentions";
  useEffect(() => {
    if (!isPurchase) setTab(searchParams.get("tab") === "retenciones" ? "retentions" : "invoices");
  }, [isPurchase, searchParams]);
  const invoices = useMemo(
    () =>
      data[kind].filter((item) =>
        `${item.document} ${item.party} ${item.rif}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [kind, query],
  );
  const filteredRetentions = useMemo(
    () =>
      retentions.filter((item) =>
        `${item.receipt} ${item.invoice} ${item.party} ${item.rif} ${item.type}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, retentions],
  );
  const filteredLength = showingRetentions ? filteredRetentions.length : invoices.length;
  const pages = size === "all" ? 1 : Math.max(1, Math.ceil(filteredLength / size));
  const currentPage = Math.min(page, pages);
  const startIndex = size === "all" ? 0 : (currentPage - 1) * size;
  const endIndex = size === "all" ? filteredLength : currentPage * size;
  const invoiceRows = size === "all" ? invoices : invoices.slice(startIndex, endIndex);
  const retentionRows = size === "all" ? filteredRetentions : filteredRetentions.slice(startIndex, endIndex);
  const first = filteredLength ? startIndex + 1 : 0;
  const last = Math.min(endIndex, filteredLength);
  const availableIva = retentions
    .filter((item) => item.type === "IVA" && item.status === "Disponible")
    .reduce((total, item) => total + item.amount, 0);
  const availableIslr = retentions
    .filter((item) => item.type === "ISLR" && item.status === "Disponible")
    .reduce((total, item) => total + item.amount, 0);
  const appliedCount = retentions.filter((item) => item.status === "Aplicada").length;

  const changeTab = (next: DirectoryTab) => {
    setTab(next);
    setQuery("");
    setPage(1);
    setMenuOpen(false);
  };

  const addRetention = (retention: Omit<RetentionRecord, "id" | "status">) => {
    setRetentions((current) => [
      { ...retention, id: Math.max(0, ...current.map((item) => item.id)) + 1, status: "Disponible" },
      ...current,
    ]);
    changeTab("retentions");
    setRetentionOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Operaciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            {isPurchase
              ? "Consulta los documentos cargados de la empresa."
              : "Controla las facturas emitidas y las retenciones entregadas por los clientes."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isPurchase && (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              onClick={() => setRetentionOpen(true)}
              type="button"
            >
              <ShieldCheck size={16} /> Registrar retención
            </button>
          )}
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white shadow-sm hover:bg-[#0e2821]"
            href={isPurchase ? "/operaciones/compras/nueva" : "/operaciones/ventas/nueva"}
          >
            Registrar {isPurchase ? "compra" : "venta"}
          </Link>
        </div>
      </div>
      {!isPurchase && (
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-stone-800">
          <button
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${
              tab === "invoices"
                ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200"
                : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
            onClick={() => changeTab("invoices")}
            type="button"
          >
            Facturas de venta · {data.sale.length}
          </button>
          <button
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${
              tab === "retentions"
                ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200"
                : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
            onClick={() => changeTab("retentions")}
            type="button"
          >
            Retenciones recibidas · {retentions.length}
          </button>
        </div>
      )}
      {showingRetentions && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="IVA disponible" value={bolivars(availableIva)} detail="Aún no aplicado" tone="emerald" />
          <SummaryCard label="ISLR disponible" value={bolivars(availableIslr)} detail="Según comprobantes" tone="sky" />
          <SummaryCard label="Retenciones aplicadas" value={String(appliedCount)} detail="Bloqueadas para reutilización" tone="stone" />
        </div>
      )}
      <section className={`${!isPurchase && "mt-5"} ${isPurchase && "mt-7"} overflow-visible rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900`}>
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={16} />
            <Input
              className="field pl-9"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={
                showingRetentions
                  ? "Buscar por comprobante, cliente o factura..."
                  : `Buscar por documento, ${partyLabel.toLowerCase()} o RIF...`
              }
              value={query}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-xs text-stone-500">
              Mostrar
              <SimpleSelect
                className="h-8 rounded-lg border border-stone-200 bg-white px-2 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                onChange={(event) => {
                  setSize(event.target.value === "all" ? "all" : (Number(event.target.value) as 25 | 50));
                  setPage(1);
                }}
                value={size}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Todos</option>
              </SimpleSelect>
            </label>
            <div className="relative">
              <Button aria-expanded={menuOpen} aria-label="Opciones de tabla" onClick={() => setMenuOpen((open) => !open)} size="icon-sm" variant="outline">
                <MoreHorizontal size={18} />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-stone-200 bg-white p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                  <button className="menu-action" type="button"><FileUp size={16} /> Importar archivo</button>
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                  <button className="menu-action" type="button"><FileSpreadsheet size={16} /> Exportar Excel</button>
                  <button className="menu-action" type="button"><FileText size={16} /> Exportar CSV</button>
                  <button className="menu-action" onClick={() => window.print()} type="button"><FileText size={16} /> Exportar PDF</button>
                  <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                  <button className="menu-action" onClick={() => window.print()} type="button"><Printer size={16} /> Imprimir</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showingRetentions ? (
          <RetentionTable rows={retentionRows} />
        ) : (
          <InvoiceTable partyLabel={partyLabel} rows={invoiceRows} />
        )}

        <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-stone-500">
            Mostrando {first}–{last} de {filteredLength} {showingRetentions ? "retenciones" : "documentos"}
          </p>
          <div className="flex items-center gap-2">
            <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="outline">
              <ChevronLeft /> Anterior
            </Button>
            <span className="min-w-20 text-center text-xs text-stone-500">Página {currentPage} de {pages}</span>
            <Button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} size="sm" variant="outline">
              Siguiente <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
      {retentionOpen && (
        <RetentionModal
          invoices={data.sale}
          onClose={() => setRetentionOpen(false)}
          onCreate={addRetention}
        />
      )}
    </div>
  );
}

function InvoiceTable({ partyLabel, rows }: { partyLabel: string; rows: TransactionRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[1060px] text-left text-sm">
        <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50">
          <TableRow>
            <TableHead className="px-5 py-3">Fecha</TableHead>
            <TableHead className="px-5 py-3">Documento</TableHead>
            <TableHead className="px-5 py-3">{partyLabel}</TableHead>
            <TableHead className="px-5 py-3 text-right">Base imponible</TableHead>
            <TableHead className="px-5 py-3 text-right">IVA</TableHead>
            <TableHead className="px-5 py-3 text-right">Total</TableHead>
            <TableHead className="px-5 py-3">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((item) => (
            <TableRow className="hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={item.id}>
              <TableCell className="px-5 py-4 text-stone-600 dark:text-stone-300">{item.date}</TableCell>
              <TableCell className="px-5 py-4 font-medium">{item.document}</TableCell>
              <TableCell className="px-5 py-4">
                <p className="font-medium">{item.party}</p>
                <p className="mt-0.5 text-xs text-stone-500">{item.rif}</p>
              </TableCell>
              <TableCell className="px-5 py-4 text-right tabular-nums">{bolivars(item.taxableBase)}</TableCell>
              <TableCell className="px-5 py-4 text-right tabular-nums">{bolivars(item.tax)}</TableCell>
              <TableCell className="px-5 py-4 text-right font-medium tabular-nums">{bolivars(item.total)}</TableCell>
              <TableCell className="px-5 py-4">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "Registrada" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                  {item.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={7}>No se encontraron documentos.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RetentionTable({ rows }: { rows: RetentionRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[1160px] text-left text-sm">
        <TableHeader className="bg-stone-50 text-xs font-medium text-stone-500 dark:bg-stone-900/50">
          <TableRow>
            <TableHead className="px-5 py-3">Comprobante</TableHead>
            <TableHead className="px-4 py-3">Cliente</TableHead>
            <TableHead className="px-4 py-3">Factura aplicada</TableHead>
            <TableHead className="px-4 py-3">Tipo</TableHead>
            <TableHead className="px-4 py-3 text-right">Base imponible</TableHead>
            <TableHead className="px-4 py-3 text-right">Criterio</TableHead>
            <TableHead className="px-4 py-3 text-right">Monto retenido</TableHead>
            <TableHead className="px-4 py-3">Estado</TableHead>
            <TableHead className="px-5 py-3">Soporte</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((item) => (
            <TableRow className="hover:bg-[#f4faf6] dark:hover:bg-emerald-950/10" key={item.id}>
              <TableCell className="px-5 py-4">
                <p className="font-medium">{item.receipt}</p>
                <p className="mt-0.5 text-xs text-stone-500">{item.date}</p>
              </TableCell>
              <TableCell className="px-4 py-4">
                <p className="font-medium">{item.party}</p>
                <p className="mt-0.5 text-xs text-stone-500">{item.rif}</p>
              </TableCell>
              <TableCell className="px-4 py-4">
                <p className="font-medium">{item.invoice}</p>
                <p className="mt-0.5 text-xs text-stone-500">IVA {bolivars(item.invoiceVat)}</p>
              </TableCell>
              <TableCell className="px-4 py-4"><span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold dark:bg-stone-800">{item.type}</span></TableCell>
              <TableCell className="px-4 py-4 text-right tabular-nums">{bolivars(item.taxableBase)}</TableCell>
              <TableCell className="px-4 py-4 text-right">{item.type === "IVA" ? `${item.ivaPercentage} % del IVA` : "Según comprobante"}</TableCell>
              <TableCell className="px-4 py-4 text-right font-semibold tabular-nums text-[#14352d] dark:text-emerald-200">{bolivars(item.amount)}</TableCell>
              <TableCell className="px-4 py-4">
                {item.status === "Disponible" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 size={13} /> Disponible
                  </span>
                ) : (
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <LockKeyhole size={13} /> Aplicada
                    </span>
                    <p className="mt-1 text-[11px] text-stone-500">{item.appliedTo}</p>
                  </div>
                )}
              </TableCell>
              <TableCell className="px-5 py-4">
                {item.voucher ? (
                  <span className="inline-flex max-w-40 items-center gap-1.5 truncate text-xs font-medium text-stone-600 dark:text-stone-300">
                    <Paperclip size={14} className="shrink-0" /> {item.voucher}
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">Sin archivo</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell className="px-5 py-12 text-center text-stone-500" colSpan={9}>No se encontraron retenciones.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RetentionModal({
  invoices,
  onClose,
  onCreate,
}: {
  invoices: TransactionRecord[];
  onClose: () => void;
  onCreate: (retention: Omit<RetentionRecord, "id" | "status">) => void;
}) {
  const [type, setType] = useState<RetentionType>("IVA");
  const [party, setParty] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [percentage, setPercentage] = useState<75 | 100>(75);
  const [islrAmount, setIslrAmount] = useState("");
  const [receipt, setReceipt] = useState("");
  const [date, setDate] = useState("2026-07-30");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const customers = Array.from(new Map(invoices.map((item) => [item.rif, { name: item.party, rif: item.rif }])).values());
  const availableInvoices = invoices.filter((item) => !party || item.rif === party);
  const selectedInvoice = invoices.find((item) => String(item.id) === invoiceId);
  const ivaAmount = selectedInvoice ? selectedInvoice.tax * percentage / 100 : 0;
  const retainedAmount = type === "IVA" ? ivaAmount : Number(islrAmount.replace(",", ".")) || 0;
  const receiptIsValid = type === "IVA" ? /^\d{15}$/.test(receipt) : Boolean(receipt.trim());
  const complete = Boolean(selectedInvoice && receiptIsValid && date && retainedAmount > 0);

  const receiveFile = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    setFile(event.dataTransfer.files?.[0] ?? null);
  };

  const save = () => {
    if (!selectedInvoice || !complete) return;
    onCreate({
      receipt: receipt.trim().toUpperCase(),
      date: new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)),
      party: selectedInvoice.party,
      rif: selectedInvoice.rif,
      invoice: selectedInvoice.document,
      type,
      taxableBase: selectedInvoice.taxableBase,
      invoiceVat: selectedInvoice.tax,
      ivaPercentage: type === "IVA" ? percentage : undefined,
      amount: retainedAmount,
      voucher: file?.name,
    });
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4" role="dialog">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-stone-900 sm:my-10">
        <div className="flex items-start justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">Registrar retención recibida</h2>
            <p className="mt-1 text-sm text-stone-500">Vincula el comprobante con una factura de venta ya registrada.</p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Tipo de retención
              <SimpleSelect
                className="field mt-1.5"
                onChange={(event) => {
                  setType(event.target.value as RetentionType);
                  setReceipt("");
                }}
                value={type}
              >
                <option value="IVA">Retención de IVA</option>
                <option value="ISLR">Retención de ISLR</option>
              </SimpleSelect>
            </label>
            <label className="text-sm font-medium">
              Cliente
              <SimpleSelect
                className="field mt-1.5"
                onChange={(event) => {
                  setParty(event.target.value);
                  setInvoiceId("");
                }}
                value={party}
              >
                <option value="">Seleccionar cliente</option>
                {customers.map((customer) => <option key={customer.rif} value={customer.rif}>{customer.name} · {customer.rif}</option>)}
              </SimpleSelect>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Factura de venta registrada
              <SimpleSelect
                className="field mt-1.5"
                disabled={!party}
                onChange={(event) => setInvoiceId(event.target.value)}
                value={invoiceId}
              >
                <option value="">Seleccionar factura</option>
                {availableInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.document} · Base {bolivars(invoice.taxableBase)} · IVA {bolivars(invoice.tax)}
                  </option>
                ))}
              </SimpleSelect>
            </label>
          </div>

          {selectedInvoice && (
            <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800 sm:grid-cols-3">
              <ReadOnlyValue label="Base imponible" value={bolivars(selectedInvoice.taxableBase)} />
              <ReadOnlyValue label="IVA de la factura" value={bolivars(selectedInvoice.tax)} />
              <ReadOnlyValue label="Total factura" value={bolivars(selectedInvoice.total)} />
            </div>
          )}

          {type === "IVA" ? (
            <div>
              <p className="text-sm font-medium">Porcentaje aplicado sobre el IVA de la factura</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[75, 100].map((value) => (
                  <button
                    className={`rounded-xl border p-4 text-left transition ${
                      percentage === value
                        ? "border-[#14352d] bg-[#e7f0e9] dark:border-emerald-400 dark:bg-emerald-950/40"
                        : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                    }`}
                    key={value}
                    onClick={() => setPercentage(value as 75 | 100)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{value} % del IVA</span>
                    <span className="mt-1 block text-xs text-stone-500">
                      Retención calculada: {bolivars(selectedInvoice ? selectedInvoice.tax * value / 100 : 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <label className="text-sm font-medium">
                Monto retenido según comprobante
                <Input
                  className="field mt-1.5 text-right tabular-nums"
                  inputMode="decimal"
                  onChange={(event) => setIslrAmount(event.target.value)}
                  placeholder="0,00"
                  value={islrAmount}
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                El cálculo automático de ISLR se habilitará cuando estén configurados el concepto, porcentaje, sustraendo, fuente y vigencia aplicables.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              N.º de comprobante
              <Input
                className="field mt-1.5 uppercase"
                inputMode={type === "IVA" ? "numeric" : "text"}
                maxLength={type === "IVA" ? 15 : undefined}
                onChange={(event) =>
                  setReceipt(
                    type === "IVA"
                      ? event.target.value.replace(/\D/g, "").slice(0, 15)
                      : event.target.value.toUpperCase(),
                  )
                }
                placeholder={type === "IVA" ? "202607000000000" : "Número del comprobante"}
                value={receipt}
              />
              {type === "IVA" && (
                <span className={`mt-1 block text-xs font-normal ${receipt && !receiptIsValid ? "text-rose-600" : "text-stone-500"}`}>
                  Debe contener 15 dígitos. Ejemplo: 202607000000000.
                </span>
              )}
            </label>
            <label className="text-sm font-medium">
              Fecha del comprobante
              <DatePicker
                className="field mt-1.5"
                onChange={(event) => setDate(event.target.value)}
                value={date} />
            </label>
          </div>

          <label
            className={`flex min-h-32 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-5 text-center transition ${
              dragging
                ? "border-[#14352d] bg-[#e7f0e9] dark:border-emerald-400 dark:bg-emerald-950/40"
                : file
                  ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                  : "border-stone-300 hover:border-[#14352d] hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={receiveFile}
          >
            {file ? <FileCheck2 className="text-emerald-600" size={24} /> : <UploadCloud className="text-[#14352d] dark:text-emerald-200" size={25} />}
            <span>
              <span className="block text-sm font-medium">{file ? file.name : "Adjuntar comprobante de retención"}</span>
              <span className="mt-1 block text-xs text-stone-500">Arrastra el PDF o imagen, o haz clic para buscar · Opcional</span>
            </span>
            <AttachmentInput
              accept=".pdf,image/*"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>

          <div className="rounded-lg border border-stone-200 p-3 text-sm dark:border-stone-700">
            <div className="flex items-start gap-2">
              <LockKeyhole className="mt-0.5 shrink-0 text-[#14352d] dark:text-emerald-200" size={16} />
              <p className="leading-5 text-stone-600 dark:text-stone-300">
                Se registrará como <strong>Disponible</strong>. Cuando una declaración la aplique, quedará vinculada a ese expediente y no podrá seleccionarse nuevamente.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-stone-100 p-5 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            Monto a registrar: <strong className="text-stone-900 dark:text-stone-100">{bolivars(retainedAmount)}</strong>
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose} variant="outline">Cancelar</Button>
            <Button className="bg-[#14352d] hover:bg-[#0e2821]" disabled={!complete} onClick={save}>
              <Plus /> Registrar retención
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>;
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "sky" | "stone";
}) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    sky: "border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20",
    stone: "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
