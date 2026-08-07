"use client";

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Kind = "purchase" | "sale";
type Retention = {
  id: string;
  type: "IVA" | "ISLR";
  receiptNumber: string;
  issueDate: string;
  percentage: string | null;
  amount: string;
  attachment: { name: string; status: string } | null;
};
type DocumentRecord = {
  id: string;
  documentNumber: string;
  issueDate: string;
  impositionPeriod: string;
  currencyCode: string;
  taxableBase: string;
  exemptAmount: string;
  nonTaxableAmount: string;
  taxAmount: string;
  totalAmount: string;
  status: "registered" | "declared" | "voided";
  voidReason: string | null;
  vatCreditStatus: "pending" | "applied" | "excluded" | null;
  counterparty: { legalName: string; rif: string } | null;
  invoiceAttachment: { name: string; status: string } | null;
  retentions: Retention[];
};
type Tab = "invoices" | "retentions";
type Sort = "date-desc" | "date-asc" | "document" | "party" | "total-desc";

const amount = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

export function TransactionDirectory({ kind }: { kind: Kind }) {
  const isPurchase = kind === "purchase";
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tab, setTab] = useState<Tab>("invoices");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<25 | 50 | "all">(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPurchase)
      setTab(
        searchParams.get("tab") === "retenciones" ? "retentions" : "invoices",
      );
  }, [isPurchase, searchParams]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch(`/api/commercial-documents?type=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error ?? "No fue posible cargar las operaciones.",
          );
        return body;
      })
      .then((body) => {
        if (active) setDocuments(body.documents);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No fue posible cargar las operaciones.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const filtered = useMemo(
    () =>
      documents
        .filter((document) =>
          `${document.documentNumber} ${document.counterparty?.legalName ?? "anulada"} ${document.counterparty?.rif ?? ""} ${document.impositionPeriod}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((left, right) => {
          if (sort === "date-asc")
            return left.issueDate.localeCompare(right.issueDate);
          if (sort === "document")
            return left.documentNumber.localeCompare(
              right.documentNumber,
              "es",
              { numeric: true },
            );
          if (sort === "party")
            return (left.counterparty?.legalName ?? "").localeCompare(
              right.counterparty?.legalName ?? "",
              "es",
            );
          if (sort === "total-desc")
            return Number(right.totalAmount) - Number(left.totalAmount);
          return (
            right.issueDate.localeCompare(left.issueDate) ||
            right.documentNumber.localeCompare(left.documentNumber, "es", {
              numeric: true,
            })
          );
        }),
    [documents, query, sort],
  );
  const retentions = useMemo(
    () =>
      documents
        .flatMap((document) =>
          document.retentions.map((retention) => ({ ...retention, document })),
        )
        .filter((retention) =>
          `${retention.receiptNumber} ${retention.type} ${retention.document.documentNumber} ${retention.document.counterparty?.legalName ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
    [documents, query],
  );
  const totalRows = tab === "retentions" ? retentions.length : filtered.length;
  const pages = size === "all" ? 1 : Math.max(1, Math.ceil(totalRows / size));
  const currentPage = Math.min(page, pages);
  const start = size === "all" ? 0 : (currentPage - 1) * size;
  const end = size === "all" ? totalRows : currentPage * size;
  const invoiceRows = filtered.slice(start, end);
  const retentionRows = retentions.slice(start, end);
  const totalsByCurrency = Object.entries(
    documents
      .filter((document) => document.status !== "voided")
      .reduce<Record<string, number>>((totals, document) => {
        totals[document.currencyCode] =
          (totals[document.currencyCode] ?? 0) + Number(document.totalAmount);
        return totals;
      }, {}),
  );
  const voidedCount = documents.filter(
    (document) => document.status === "voided",
  ).length;

  const changeTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setPage(1);
  };
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Empresa activa / Operaciones</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {isPurchase ? "Compras" : "Ventas"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            {isPurchase
              ? "Facturas registradas y créditos fiscales pendientes de decisión en la declaración."
              : "Facturas emitidas por correlativo y retenciones recibidas de cada cliente."}
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-3 text-sm font-medium text-white"
          href={
            isPurchase
              ? "/operaciones/compras/nueva"
              : "/operaciones/ventas/nueva"
          }
        >
          <Plus size={16} /> Registrar {isPurchase ? "compra" : "venta"}
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Summary
          label="Operaciones registradas"
          value={String(
            documents.filter((document) => document.status !== "voided").length,
          )}
          detail="Empresa activa"
        />
        <Summary
          label="Total registrado"
          value={
            totalsByCurrency.length
              ? totalsByCurrency
                  .map(
                    ([currency, total]) =>
                      `${currency} ${amount.format(total)}`,
                  )
                  .join(" · ")
              : "0,00"
          }
          detail={
            totalsByCurrency.length > 1
              ? "Separado por moneda"
              : "Sin conversión monetaria"
          }
        />
        <Summary
          label={isPurchase ? "Créditos pendientes" : "Correlativos anulados"}
          value={String(
            isPurchase
              ? documents.filter(
                  (document) => document.vatCreditStatus === "pending",
                ).length
              : voidedCount,
          )}
          detail={
            isPurchase ? "Se decidirán en la declaración" : "No se reutilizan"
          }
        />
      </div>
      {!isPurchase && (
        <div className="mt-6 flex gap-1 border-b border-stone-200 dark:border-stone-800">
          <button
            className={`border-b-2 px-3 py-3 text-sm font-medium ${tab === "invoices" ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500"}`}
            onClick={() => changeTab("invoices")}
            type="button"
          >
            Facturas · {documents.length}
          </button>
          <button
            className={`border-b-2 px-3 py-3 text-sm font-medium ${tab === "retentions" ? "border-[#14352d] text-[#14352d] dark:border-emerald-300 dark:text-emerald-200" : "border-transparent text-stone-500"}`}
            onClick={() => changeTab("retentions")}
            type="button"
          >
            Retenciones recibidas ·{" "}
            {documents.reduce(
              (sum, document) => sum + document.retentions.length,
              0,
            )}
          </button>
        </div>
      )}
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
              size={16}
            />
            <Input
              className="field pl-9"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={
                tab === "retentions"
                  ? "Buscar comprobante, factura o cliente"
                  : `Buscar factura, ${isPurchase ? "proveedor" : "cliente"} o período`
              }
              value={query}
            />
          </div>
          {tab === "invoices" && (
            <label className="flex items-center gap-2 text-xs text-stone-500">
              <ArrowUpDown size={14} /> Ordenar
              <SimpleSelect
                className="field w-44"
                onChange={(event) => setSort(event.target.value as Sort)}
                value={sort}
              >
                <option value="date-desc">Más recientes</option>
                <option value="date-asc">Más antiguas</option>
                <option value="document">N.º de factura</option>
                <option value="party">Contraparte</option>
                <option value="total-desc">Mayor importe</option>
              </SimpleSelect>
            </label>
          )}
        </div>
        {loading ? (
          <p className="flex items-center justify-center gap-2 p-12 text-sm text-stone-500">
            <LoaderCircle className="animate-spin" size={17} /> Cargando
            operaciones…
          </p>
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : tab === "invoices" ? (
          <InvoiceTable isPurchase={isPurchase} rows={invoiceRows} />
        ) : (
          <RetentionTable rows={retentionRows} />
        )}
        {!loading && !error && !totalRows && (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-stone-300 dark:text-stone-700" size={28} />
            <p className="mt-3 font-medium">Aún no hay registros</p>
            <p className="mt-1 text-sm text-stone-500">
              La primera operación aparecerá aquí al guardarse.
            </p>
          </div>
        )}
        {!loading && totalRows > 0 && (
          <div className="flex flex-col gap-3 border-t border-stone-100 px-4 py-3 text-sm text-stone-500 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <SimpleSelect
                className="field w-24"
                onChange={(event) => {
                  setSize(
                    event.target.value === "all"
                      ? "all"
                      : (Number(event.target.value) as 25 | 50),
                  );
                  setPage(1);
                }}
                value={String(size)}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">Todos</option>
              </SimpleSelect>
              <span>
                {start + 1}–{Math.min(end, totalRows)} de {totalRows}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Página anterior"
                className="grid size-8 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                <ChevronLeft size={15} />
              </button>
              <span>
                Página {currentPage} de {pages}
              </span>
              <button
                aria-label="Página siguiente"
                className="grid size-8 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                disabled={currentPage === pages}
                onClick={() => setPage((value) => Math.min(pages, value + 1))}
                type="button"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceTable({
  isPurchase,
  rows,
}: {
  isPurchase: boolean;
  rows: DocumentRecord[];
}) {
  const router = useRouter();
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px]">
        <TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/70 dark:text-stone-400">
          <TableRow>
            <TableHead className="px-5 py-3">Factura</TableHead>
            <TableHead className="px-3 py-3">Fecha / período</TableHead>
            <TableHead className="px-3 py-3">
              {isPurchase ? "Proveedor" : "Cliente"}
            </TableHead>
            <TableHead className="px-3 py-3 text-right">Base</TableHead>
            <TableHead className="px-3 py-3 text-right">IVA</TableHead>
            <TableHead className="px-3 py-3 text-right">Total</TableHead>
            <TableHead className="px-5 py-3">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((document) => (
            <TableRow
              className="cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#14352d]"
              key={document.id}
              onClick={() => {
                router.push(
                  `/operaciones/${isPurchase ? "compras" : "ventas"}/${document.id}/editar`,
                );
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(
                    `/operaciones/${isPurchase ? "compras" : "ventas"}/${document.id}/editar`,
                  );
                }
              }}
            >
              <TableCell className="px-5 py-4">
                <p className="font-semibold">{document.documentNumber}</p>
                {document.invoiceAttachment && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                    <Paperclip size={12} /> {document.invoiceAttachment.name}
                  </p>
                )}
              </TableCell>
              <TableCell className="px-3 py-4">
                <p>{dateLabel(document.issueDate)}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {document.impositionPeriod}
                </p>
              </TableCell>
              <TableCell className="px-3 py-4">
                {document.counterparty ? (
                  <>
                    <p className="font-medium">
                      {document.counterparty.legalName}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {document.counterparty.rif}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-rose-700 dark:text-rose-400">
                      Correlativo anulado
                    </p>
                    <p className="mt-1 max-w-56 text-xs text-stone-500">
                      {document.voidReason}
                    </p>
                  </>
                )}
              </TableCell>
              <TableCell className="px-3 py-4 text-right tabular-nums">
                {document.currencyCode}{" "}
                {amount.format(
                  Number(document.taxableBase) +
                    Number(document.exemptAmount) +
                    Number(document.nonTaxableAmount),
                )}
              </TableCell>
              <TableCell className="px-3 py-4 text-right tabular-nums">
                {document.currencyCode}{" "}
                {amount.format(Number(document.taxAmount))}
              </TableCell>
              <TableCell className="px-3 py-4 text-right font-semibold tabular-nums">
                {document.currencyCode}{" "}
                {amount.format(Number(document.totalAmount))}
              </TableCell>
              <TableCell className="px-5 py-4">
                {document.status === "voided" ? (
                  <Status tone="rose">Anulada</Status>
                ) : document.status === "declared" ? (
                  <Status tone="stone">Declarada</Status>
                ) : isPurchase && document.vatCreditStatus === "pending" ? (
                  <Status tone="sky">IVA pendiente</Status>
                ) : (
                  <Status tone="emerald">Registrada</Status>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RetentionTable({
  rows,
}: {
  rows: Array<Retention & { document: DocumentRecord }>;
}) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/70 dark:text-stone-400">
          <TableRow>
            <TableHead className="px-5 py-3">Comprobante</TableHead>
            <TableHead className="px-3 py-3">Tipo</TableHead>
            <TableHead className="px-3 py-3">Factura / cliente</TableHead>
            <TableHead className="px-3 py-3">Fecha</TableHead>
            <TableHead className="px-3 py-3 text-right">Monto</TableHead>
            <TableHead className="px-5 py-3">Soporte</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((retention) => (
            <TableRow key={retention.id}>
              <TableCell className="px-5 py-4 font-semibold">
                {retention.receiptNumber}
              </TableCell>
              <TableCell className="px-3 py-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f0e9] px-2 py-1 text-xs font-medium text-[#14352d] dark:bg-emerald-950 dark:text-emerald-300">
                  <ShieldCheck size={12} /> {retention.type}
                </span>
              </TableCell>
              <TableCell className="px-3 py-4">
                <p className="font-medium">
                  {retention.document.documentNumber}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {retention.document.counterparty?.legalName}
                </p>
              </TableCell>
              <TableCell className="px-3 py-4">
                {dateLabel(retention.issueDate)}
              </TableCell>
              <TableCell className="px-3 py-4 text-right font-semibold tabular-nums">
                {retention.document.currencyCode}{" "}
                {amount.format(Number(retention.amount))}
              </TableCell>
              <TableCell className="px-5 py-4">
                {retention.attachment ? (
                  <span className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300">
                    <Paperclip size={12} /> {retention.attachment.name}
                  </span>
                ) : (
                  <span className="text-xs text-stone-400 dark:text-stone-500">Sin soporte</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
function Summary({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
function Status({
  children,
  tone,
}: {
  children: string;
  tone: "emerald" | "rose" | "sky" | "stone";
}) {
  const classes = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    stone: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes[tone]}`}
    >
      {children}
    </span>
  );
}
