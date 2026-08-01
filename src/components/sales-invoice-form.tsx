"use client";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Keyboard,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Customer = {
  name: string;
  rif: string;
  receivableAccount: string;
  revenueAccount: string;
};

type TaxTreatment = "taxable" | "exempt";
type RetentionType = "none" | "IVA" | "ISLR";
type EntrySource = "customer" | "revenue" | "tax" | "manual";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: string;
  price: string;
  taxTreatment: TaxTreatment;
};

type AccountingEntry = {
  id: string;
  account: string;
  debit: string;
  credit: string;
  source: EntrySource;
};

const initialCustomers: Customer[] = [
  {
    name: "Comercializadora San Miguel, C.A.",
    rif: "J-401256789",
    receivableAccount: "1.1.02.001 · Cuentas por cobrar - Clientes",
    revenueAccount: "4.1.01.001 · Ingresos por ventas",
  },
  {
    name: "Alimentos La Montaña, C.A.",
    rif: "J-308774521",
    receivableAccount: "1.1.02.001 · Cuentas por cobrar - Clientes",
    revenueAccount: "4.1.01.010 · Ingresos por servicios",
  },
];

const genericCustomer: Customer = {
  name: "Cliente sin seleccionar",
  rif: "",
  receivableAccount: "1.1.02.001 · Cuentas por cobrar - Clientes",
  revenueAccount: "4.1.01.001 · Ingresos por ventas",
};

const accountOptions = [
  "1.1.02.001 · Cuentas por cobrar - Clientes",
  "1.1.02.010 · Cuentas por cobrar - Relacionadas",
  "1.1.08.005 · Retenciones de IVA por cobrar",
  "1.1.08.006 · Retenciones de ISLR por cobrar",
  "2.1.01.001 · IVA débito fiscal",
  "4.1.01.001 · Ingresos por ventas",
  "4.1.01.002 · Ingresos exentos",
  "4.1.01.010 · Ingresos por servicios",
  "9.9.99.999 · Cuenta por clasificar",
];

const numeric = (value: string) =>
  Number(value.replaceAll(".", "").replace(",", ".")) || 0;

const amount = (value: number) =>
  value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const editableAmount = (value: string) => value.replace(/[^0-9,.-]/g, "");

const emptyItem = (id: string): InvoiceItem => ({
  id,
  description: "",
  quantity: "1",
  price: "",
  taxTreatment: "taxable",
});

function automaticEntries({
  customer,
  taxableBase,
  exemptBase,
  tax,
  total,
}: {
  customer: Customer;
  taxableBase: number;
  exemptBase: number;
  tax: number;
  total: number;
}): AccountingEntry[] {
  return [
    {
      id: "auto-receivable",
      account: customer.receivableAccount,
      debit: amount(total),
      credit: "",
      source: "customer",
    },
    {
      id: "auto-taxable-revenue",
      account: customer.revenueAccount,
      debit: "",
      credit: amount(taxableBase),
      source: "revenue",
    },
    ...(exemptBase > 0
      ? [
          {
            id: "auto-exempt-revenue",
            account: "4.1.01.002 · Ingresos exentos",
            debit: "",
            credit: amount(exemptBase),
            source: "revenue" as const,
          },
        ]
      : []),
    {
      id: "auto-tax",
      account: "2.1.01.001 · IVA débito fiscal",
      debit: "",
      credit: amount(tax),
      source: "tax",
    },
  ];
}

export function SalesInvoiceForm() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState("2026-08-01");
  const [currency, setCurrency] = useState("VES");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem("item-1")]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [retentionFile, setRetentionFile] = useState<File | null>(null);
  const [retentionType, setRetentionType] = useState<RetentionType>("none");
  const [retentionReceipt, setRetentionReceipt] = useState("");
  const [retentionDate, setRetentionDate] = useState("2026-08-01");
  const [retentionPercentage, setRetentionPercentage] = useState<75 | 100>(75);
  const [islrAmount, setIslrAmount] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [entries, setEntries] = useState<AccountingEntry[]>(() =>
    automaticEntries({
      customer: genericCustomer,
      taxableBase: 0,
      exemptBase: 0,
      tax: 0,
      total: 0,
    }),
  );

  const itemCounter = useRef(1);
  const manualEntryCounter = useRef(0);
  const configuredVatRate = 16;

  const itemAmounts = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        lineTotal: numeric(item.quantity) * numeric(item.price),
      })),
    [items],
  );
  const taxableBase = useMemo(
    () =>
      itemAmounts
        .filter((item) => item.taxTreatment === "taxable")
        .reduce((sum, item) => sum + item.lineTotal, 0),
    [itemAmounts],
  );
  const exemptBase = useMemo(
    () =>
      itemAmounts
        .filter((item) => item.taxTreatment === "exempt")
        .reduce((sum, item) => sum + item.lineTotal, 0),
    [itemAmounts],
  );
  const subtotal = taxableBase + exemptBase;
  const tax = taxableBase * (configuredVatRate / 100);
  const total = subtotal + tax;
  const results = customers.filter((item) =>
    `${item.name} ${item.rif}`.toLowerCase().includes(customerQuery.toLowerCase()),
  );

  const debitTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + numeric(entry.debit), 0),
    [entries],
  );
  const creditTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + numeric(entry.credit), 0),
    [entries],
  );
  const difference = debitTotal - creditTotal;
  const hasLedgerAmounts = debitTotal > 0 || creditTotal > 0;
  const isBalanced = hasLedgerAmounts && Math.abs(difference) < 0.005;

  const ivaReceiptIsValid = /^\d{15}$/.test(retentionReceipt);
  const retentionAmount =
    retentionType === "IVA"
      ? tax * (retentionPercentage / 100)
      : retentionType === "ISLR"
        ? numeric(islrAmount)
        : 0;
  const retentionIsComplete =
    retentionType === "none" ||
    Boolean(
      retentionDate &&
        retentionAmount > 0 &&
        (retentionType === "IVA" ? ivaReceiptIsValid : retentionReceipt.trim()),
    );
  const canSave = total > 0 && isBalanced && retentionIsComplete;

  useEffect(() => {
    const nextAutomaticEntries = automaticEntries({
      customer: selectedCustomer ?? genericCustomer,
      taxableBase,
      exemptBase,
      tax,
      total,
    });

    setEntries((current) => {
      const manualEntries = current.filter((entry) => entry.source === "manual");
      const synchronizedEntries = nextAutomaticEntries.map((entry) => {
        const previous = current.find((candidate) => candidate.id === entry.id);
        return previous ? { ...entry, account: previous.account } : entry;
      });
      return [...synchronizedEntries, ...manualEntries];
    });
  }, [exemptBase, selectedCustomer, tax, taxableBase, total]);

  const resetAutomaticEntries = useCallback(() => {
    setEntries(
      automaticEntries({
        customer: selectedCustomer ?? genericCustomer,
        taxableBase,
        exemptBase,
        tax,
        total,
      }),
    );
  }, [exemptBase, selectedCustomer, tax, taxableBase, total]);

  const addItem = useCallback(() => {
    itemCounter.current += 1;
    setItems((current) => [...current, emptyItem(`item-${itemCounter.current}`)]);
  }, []);

  const addEntry = useCallback(() => {
    manualEntryCounter.current += 1;
    setEntries((current) => [
      ...current,
      {
        id: `manual-${manualEntryCounter.current}`,
        account: "9.9.99.999 · Cuenta por clasificar",
        debit: "",
        credit: "",
        source: "manual",
      },
    ]);
  }, []);

  const resetForNext = useCallback(() => {
    setCustomerQuery("");
    setSelectedCustomer(null);
    setInvoice("");
    setItems([emptyItem("item-1")]);
    setInvoiceFile(null);
    setRetentionFile(null);
    setRetentionType("none");
    setRetentionReceipt("");
    setIslrAmount("");
    setSavedMessage("");
    setEntries(
      automaticEntries({
        customer: genericCustomer,
        taxableBase: 0,
        exemptBase: 0,
        tax: 0,
        total: 0,
      }),
    );
    itemCounter.current = 1;
    manualEntryCounter.current = 0;
  }, []);

  const save = useCallback(
    (next = false) => {
      if (!canSave) return;
      setSavedMessage(
        retentionType === "none"
          ? "Borrador de venta guardado localmente."
          : "Borrador de venta y retención asociada guardados localmente.",
      );
      if (next) resetForNext();
    },
    [canSave, resetForNext, retentionType],
  );

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        save();
      }
      if (key === "n") {
        event.preventDefault();
        save(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);

  const selectCustomer = (item: Customer) => {
    setSelectedCustomer(item);
    setCustomerQuery(item.name);
    setPickerOpen(false);
    setEntries((current) => [
      ...automaticEntries({
        customer: item,
        taxableBase,
        exemptBase,
        tax,
        total,
      }),
      ...current.filter((entry) => entry.source === "manual"),
    ]);
  };

  const createCustomer = (item: Customer) => {
    setCustomers((current) => [...current, item]);
    selectCustomer(item);
    setNewCustomerOpen(false);
  };

  const updateItem = (id: string, patch: Partial<Omit<InvoiceItem, "id">>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (id: string) => {
    setItems((current) =>
      current.length === 1
        ? [emptyItem(current[0].id)]
        : current.filter((item) => item.id !== id),
    );
  };

  const updateEntry = (
    id: string,
    patch: Partial<Pick<AccountingEntry, "account" | "debit" | "credit">>,
  ) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-[#14352d] dark:text-stone-300"
          href="/operaciones/ventas"
        >
          <ArrowLeft size={17} /> Volver a ventas
        </Link>
        <span className="flex items-center gap-2 text-xs text-stone-500">
          <Keyboard size={14} />
          <span className="hidden items-center gap-1 sm:flex">
            <Kbd>Alt</Kbd> + <Kbd>S</Kbd> guardar · <Kbd>Alt</Kbd> + <Kbd>N</Kbd> guardar y nuevo
          </span>
        </span>
      </div>

      <div className="mt-5 flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-stone-500">Ventas / Nueva factura</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Registrar factura de venta
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Registra los ítems y revisa el asiento sugerido antes de guardar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!canSave} onClick={() => save()} variant="outline">
            <Save /> Guardar
          </Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!canSave}
            onClick={() => save(true)}
          >
            Guardar y nuevo
          </Button>
        </div>
      </div>

      {savedMessage && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} /> {savedMessage}
        </p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5">
          <Section title="Datos del documento" description="Información fiscal y cliente asociado.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="field-label relative sm:col-span-2 lg:col-span-4">
                Cliente *
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
                    <Input
                      aria-expanded={pickerOpen}
                      className="field pl-9"
                      onChange={(event) => {
                        setCustomerQuery(event.target.value);
                        setSelectedCustomer(null);
                        setPickerOpen(true);
                      }}
                      onClick={() => setPickerOpen(true)}
                      onFocus={() => setPickerOpen(true)}
                      placeholder="Buscar por nombre o RIF"
                      value={customerQuery}
                    />
                    {pickerOpen && (
                      <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
                        <p className="px-3 pb-1 pt-3 text-xs font-medium text-stone-500">
                          Clientes registrados
                        </p>
                        {results.map((item) => (
                          <button
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#f4faf6] dark:hover:bg-stone-800"
                            key={item.rif}
                            onClick={() => selectCustomer(item)}
                            type="button"
                          >
                            <span>
                              <span className="block text-sm font-medium">{item.name}</span>
                              <span className="text-xs text-stone-500">{item.rif}</span>
                            </span>
                            <span className="text-xs text-[#14352d] dark:text-emerald-300">
                              Usar cuentas
                            </span>
                          </button>
                        ))}
                        {!results.length && (
                          <p className="px-3 py-3 text-sm text-stone-500">No hay coincidencias.</p>
                        )}
                        <div className="border-t border-stone-100 p-1 dark:border-stone-800">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-[#14352d] hover:bg-[#e7f0e9] dark:text-emerald-300 dark:hover:bg-stone-800"
                            onClick={() => {
                              setPickerOpen(false);
                              setNewCustomerOpen(true);
                            }}
                            type="button"
                          >
                            <Plus size={16} /> Crear cliente
                            {customerQuery ? `: ${customerQuery}` : ""}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    className="shrink-0"
                    onClick={() => setNewCustomerOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <Plus /> <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </div>
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Al seleccionar se cargan las cuentas predeterminadas del cliente.
                </span>
              </div>

              <Field label="N.º de factura *">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => setInvoice(event.target.value)}
                  placeholder="Ej.: 000020"
                  value={invoice}
                />
              </Field>
              <Field label="Fecha del documento">
                <div className="relative mt-1.5">
                  <DatePicker
                    className="field"
                    onChange={(event) => setDate(event.target.value)}
                    value={date}
                  />
                  <CalendarDays
                    className="pointer-events-none absolute right-3 top-2.5 text-stone-400"
                    size={16}
                  />
                </div>
              </Field>
              <Field label="Moneda">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(event) => setCurrency(event.target.value)}
                  value={currency}
                >
                  <option>VES</option>
                  <option>USD</option>
                </SimpleSelect>
              </Field>
            </div>
          </Section>

          <Section
            title="Detalle de ítems"
            description="Clasifica cada producto o servicio como gravado o exento. La tasa proviene de la configuración vigente de la empresa."
            action={
              <Button onClick={addItem} size="sm" type="button" variant="outline">
                <Plus /> Agregar ítem
              </Button>
            }
          >
            <div className="hidden grid-cols-[minmax(12rem,1fr)_5rem_8rem_9rem_8rem_2rem] gap-2 px-1 text-xs font-medium text-stone-500 md:grid">
              <span>Descripción</span>
              <span className="text-right">Cantidad</span>
              <span className="text-right">Precio</span>
              <span>Tratamiento</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            <div className="mt-2 space-y-2">
              {itemAmounts.map((item) => (
                <InvoiceItemRow
                  currency={currency}
                  item={item}
                  key={item.id}
                  onRemove={() => removeItem(item.id)}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  vatRate={configuredVatRate}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 text-sm dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-stone-500">
                Parámetro de IVA configurado · {configuredVatRate} %
              </span>
              <span className="font-medium">
                Subtotal {currency} {amount(subtotal)}
              </span>
            </div>
          </Section>

          <Section
            title="Distribución contable"
            description="CxC, ingresos e IVA débito fiscal se sugieren automáticamente. Puedes cambiar cuentas, importes o agregar líneas."
            action={
              <Button onClick={resetAutomaticEntries} size="sm" type="button" variant="ghost">
                <RotateCcw size={15} /> Restablecer sugerencia
              </Button>
            }
          >
            <div className="hidden grid-cols-[minmax(15rem,1fr)_9rem_9rem_2rem] gap-2 px-1 text-xs font-medium text-stone-500 md:grid">
              <span>Cuenta</span>
              <span className="text-right">Debe</span>
              <span className="text-right">Haber</span>
              <span />
            </div>
            <div className="mt-2 space-y-2">
              {entries.map((entry) => (
                <AccountingEntryRow
                  currency={currency}
                  entry={entry}
                  key={entry.id}
                  onRemove={() =>
                    setEntries((current) =>
                      current.filter((candidate) => candidate.id !== entry.id),
                    )
                  }
                  onUpdate={(patch) => updateEntry(entry.id, patch)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button onClick={addEntry} size="sm" type="button" variant="outline">
                <Plus /> Agregar línea
              </Button>
              <p className="text-xs text-stone-500">
                Un importe solo puede registrarse en Debe o Haber por línea.
              </p>
            </div>

            <div
              className={`mt-5 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center ${
                isBalanced
                  ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25"
                  : "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/25"
              }`}
            >
              <BalanceAmount label="Total débitos" value={`${currency} ${amount(debitTotal)}`} />
              <BalanceAmount label="Total créditos" value={`${currency} ${amount(creditTotal)}`} />
              <div className="sm:text-right">
                {isBalanced ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={17} /> Asiento cuadrado
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
                      <CircleAlert size={17} /> Descuadre {currency} {amount(Math.abs(difference))}
                    </span>
                    <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
                      {!hasLedgerAmounts
                        ? "Agrega importes a los ítems."
                        : difference < 0
                          ? "Faltan débitos."
                          : "Faltan créditos."}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Section>

          <Section
            title="Soportes de la venta"
            description="Puedes adjuntarlos ahora o agregarlos posteriormente."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AttachmentInput
                accept=".pdf,image/*"
                description="PDF o imagen · Opcional"
                fileName={invoiceFile?.name}
                label="Factura de venta"
                onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
              />
              <AttachmentInput
                accept=".pdf,image/*"
                description="PDF o imagen · Opcional"
                fileName={retentionFile?.name}
                label="Comprobante de retención"
                onChange={(event) => setRetentionFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </Section>

          <Section
            title="Retención recibida"
            description="Registra el comprobante junto con la factura si ya fue entregado; también podrás hacerlo después."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-500">
                El asiento de la factura mantiene el total por cobrar; la retención queda vinculada como soporte asociado.
              </p>
              <SimpleSelect
                className="field shrink-0 sm:w-52"
                onChange={(event) => {
                  setRetentionType(event.target.value as RetentionType);
                  setRetentionReceipt("");
                }}
                value={retentionType}
              >
                <option value="none">Sin retención</option>
                <option value="IVA">Retención de IVA</option>
                <option value="ISLR">Retención de ISLR</option>
              </SimpleSelect>
            </div>

            {retentionType !== "none" && (
              <div className="mt-5 space-y-4 border-t border-stone-100 pt-5 dark:border-stone-800">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="N.º de comprobante">
                    <Input
                      className="field mt-1.5"
                      inputMode={retentionType === "IVA" ? "numeric" : "text"}
                      maxLength={retentionType === "IVA" ? 15 : undefined}
                      onChange={(event) =>
                        setRetentionReceipt(
                          retentionType === "IVA"
                            ? event.target.value.replace(/\D/g, "").slice(0, 15)
                            : event.target.value.toUpperCase(),
                        )
                      }
                      placeholder={
                        retentionType === "IVA"
                          ? "202608000000000"
                          : "Número del comprobante"
                      }
                      value={retentionReceipt}
                    />
                    {retentionType === "IVA" && (
                      <span
                        className={`mt-1 block text-xs font-normal ${
                          retentionReceipt && !ivaReceiptIsValid
                            ? "text-rose-600"
                            : "text-stone-500"
                        }`}
                      >
                        Debe contener 15 dígitos.
                      </span>
                    )}
                  </Field>
                  <Field label="Fecha del comprobante">
                    <DatePicker
                      className="field mt-1.5"
                      onChange={(event) => setRetentionDate(event.target.value)}
                      value={retentionDate}
                    />
                  </Field>
                </div>

                {retentionType === "IVA" ? (
                  <div>
                    <p className="text-sm font-medium">Porcentaje retenido sobre el IVA</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {[75, 100].map((value) => (
                        <button
                          className={`rounded-xl border p-4 text-left ${
                            retentionPercentage === value
                              ? "border-[#14352d] bg-[#e7f0e9] dark:border-emerald-700 dark:bg-emerald-950/25"
                              : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                          }`}
                          key={value}
                          onClick={() => setRetentionPercentage(value as 75 | 100)}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">{value} % del IVA</span>
                          <span className="mt-1 block text-xs text-stone-500">
                            Monto: {currency} {amount(tax * (value / 100))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/25">
                    <Field label="Monto retenido según comprobante">
                      <Input
                        className="field mt-1.5 text-right"
                        inputMode="decimal"
                        onChange={(event) => setIslrAmount(editableAmount(event.target.value))}
                        placeholder="0,00"
                        value={islrAmount}
                      />
                    </Field>
                    <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
                      El cálculo automático se habilitará cuando estén configurados concepto, porcentaje, sustraendo, fuente y vigencia.
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  Retención vinculada por {currency} {amount(retentionAmount)}.
                </div>
              </div>
            )}
          </Section>

          <Section title="Notas" description="Opcional para este borrador.">
            <textarea
              className="field min-h-20 py-2"
              placeholder="Observaciones internas (opcional)"
            />
          </Section>
        </div>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:sticky xl:top-22">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Revisión de la factura</p>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Borrador
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Cliente" value={selectedCustomer?.name ?? "Sin seleccionar"} />
            <Row label="RIF" value={selectedCustomer?.rif || "—"} />
            <Row label="Factura" value={invoice || "Sin número"} />
            <Row label="Fecha" value={date.split("-").reverse().join("/")} />
          </dl>
          <div className="my-5 border-t border-stone-200 dark:border-stone-800" />
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Total factura
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {currency} {amount(total)}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Base gravable" value={`${currency} ${amount(taxableBase)}`} />
            <Row label="Exento" value={`${currency} ${amount(exemptBase)}`} />
            <Row label={`IVA (${configuredVatRate} %)`} value={`${currency} ${amount(tax)}`} />
            <Row label="Ítems" value={String(items.length)} />
          </div>
          <div className="my-5 border-t border-stone-200 dark:border-stone-800" />
          <div className="space-y-3 text-sm">
            <Row
              label="Asiento"
              value={isBalanced ? "Cuadrado" : `Descuadre ${amount(Math.abs(difference))}`}
            />
            <Row
              label="Retención"
              value={retentionType === "none" ? "No indicada" : retentionType}
            />
            {retentionType !== "none" && (
              <Row label="Monto retenido" value={`${currency} ${amount(retentionAmount)}`} />
            )}
            <Row label="Factura adjunta" value={invoiceFile ? "Sí" : "Opcional"} />
          </div>
          <div
            className={`mt-5 rounded-lg p-3 text-xs leading-5 ${
              canSave
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            }`}
          >
            {canSave
              ? "Ítems y asiento listos para guardar."
              : !retentionIsComplete
                ? "Completa los datos de la retención para guardar."
                : "Agrega importes y corrige el descuadre para habilitar el guardado."}
          </div>
        </aside>
      </div>

      {newCustomerOpen && (
        <QuickCustomerModal
          initialName={customerQuery}
          onClose={() => setNewCustomerOpen(false)}
          onCreate={createCustomer}
        />
      )}
    </div>
  );
}

function InvoiceItemRow({
  currency,
  item,
  onRemove,
  onUpdate,
  vatRate,
}: {
  currency: string;
  item: InvoiceItem & { lineTotal: number };
  onRemove: () => void;
  onUpdate: (patch: Partial<Omit<InvoiceItem, "id">>) => void;
  vatRate: number;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700 md:grid-cols-[minmax(12rem,1fr)_5rem_8rem_9rem_8rem_2rem] md:items-center md:gap-2 md:border-0 md:p-0">
      <ItemField label="Descripción">
        <Input
          className="field"
          onChange={(event) => onUpdate({ description: event.target.value })}
          placeholder="Producto o servicio"
          value={item.description}
        />
      </ItemField>
      <ItemField label="Cantidad">
        <Input
          className="field text-right tabular-nums"
          inputMode="decimal"
          onChange={(event) => onUpdate({ quantity: editableAmount(event.target.value) })}
          value={item.quantity}
        />
      </ItemField>
      <ItemField label={`Precio ${currency}`}>
        <Input
          className="field text-right tabular-nums"
          inputMode="decimal"
          onChange={(event) => onUpdate({ price: editableAmount(event.target.value) })}
          placeholder="0,00"
          value={item.price}
        />
      </ItemField>
      <ItemField label="Tratamiento">
        <SimpleSelect
          className="field w-full"
          onChange={(event) => onUpdate({ taxTreatment: event.target.value as TaxTreatment })}
          value={item.taxTreatment}
        >
          <option value="taxable">Gravado {vatRate} %</option>
          <option value="exempt">Exento</option>
        </SimpleSelect>
      </ItemField>
      <div className="text-right">
        <span className="mb-1 block text-xs font-medium text-stone-500 md:hidden">Total</span>
        <span className="font-medium tabular-nums">{currency} {amount(item.lineTotal)}</span>
      </div>
      <Button
        aria-label="Eliminar ítem"
        className="justify-self-end text-stone-400 hover:text-rose-600"
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

function ItemField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-stone-500 md:hidden">{label}</span>
      {children}
    </label>
  );
}

function AccountingEntryRow({
  currency,
  entry,
  onRemove,
  onUpdate,
}: {
  currency: string;
  entry: AccountingEntry;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<AccountingEntry, "account" | "debit" | "credit">>) => void;
}) {
  const sourceLabels: Record<EntrySource, string> = {
    customer: "Cliente",
    revenue: "Ingreso",
    tax: "Impuesto",
    manual: "Manual",
  };

  return (
    <div className="grid gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-700 md:grid-cols-[minmax(15rem,1fr)_9rem_9rem_2rem] md:items-center md:border-0 md:p-0">
      <div>
        <span className="mb-1 block text-xs font-medium text-stone-500 md:hidden">Cuenta</span>
        <SimpleSelect
          className="field w-full"
          onChange={(event) => onUpdate({ account: event.target.value })}
          value={entry.account}
        >
          {accountOptions.map((account) => (
            <option key={account} value={account}>{account}</option>
          ))}
        </SimpleSelect>
        <span className="mt-1 block text-[11px] text-stone-400 md:hidden">
          Origen: {sourceLabels[entry.source]}
        </span>
      </div>
      <LedgerInput
        currency={currency}
        label="Debe"
        onChange={(value) =>
          onUpdate({ debit: value, ...(numeric(value) ? { credit: "" } : {}) })
        }
        value={entry.debit}
      />
      <LedgerInput
        currency={currency}
        label="Haber"
        onChange={(value) =>
          onUpdate({ credit: value, ...(numeric(value) ? { debit: "" } : {}) })
        }
        value={entry.credit}
      />
      <Button
        aria-label="Eliminar línea contable"
        className="justify-self-end text-stone-400 hover:text-rose-600"
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}

function LedgerInput({
  currency,
  label,
  onChange,
  value,
}: {
  currency: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-stone-500 md:hidden">{label}</span>
      <Input
        aria-label={`${label} en ${currency}`}
        className="field text-right tabular-nums"
        inputMode="decimal"
        onChange={(event) => onChange(editableAmount(event.target.value))}
        placeholder="0,00"
        value={value}
      />
    </label>
  );
}

function QuickCustomerModal({
  initialName,
  onClose,
  onCreate,
}: {
  initialName: string;
  onClose: () => void;
  onCreate: (customer: Customer) => void;
}) {
  const [name, setName] = useState(initialName);
  const [rif, setRif] = useState("");
  const [address, setAddress] = useState("");
  const [receivableAccount, setReceivableAccount] = useState(accountOptions[0]);
  const [revenueAccount, setRevenueAccount] = useState(accountOptions[5]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <div className="flex justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">Nuevo cliente</h2>
            <p className="mt-1 text-sm text-stone-500">
              Guarda sus cuentas predeterminadas y vuelve a la factura.
            </p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost">
            <X />
          </Button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="RIF *">
            <div className="mt-1.5 flex gap-2">
              <Input
                className="field"
                onChange={(event) => setRif(event.target.value.toUpperCase())}
                placeholder="J-00000000-0"
                value={rif}
              />
              <Button disabled size="sm" variant="outline">SENIAT</Button>
            </div>
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Consulta pendiente de integración.
            </span>
          </Field>
          <Field label="Nombre legal *">
            <Input
              className="field mt-1.5"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </Field>
          <Field label="Dirección fiscal">
            <textarea
              className="field mt-1.5 h-20 py-2"
              onChange={(event) => setAddress(event.target.value)}
              value={address}
            />
          </Field>
          <Field label="Cuenta por cobrar predeterminada">
            <SimpleSelect
              className="field mt-1.5"
              onChange={(event) => setReceivableAccount(event.target.value)}
              value={receivableAccount}
            >
              {accountOptions.slice(0, 2).map((account) => (
                <option key={account} value={account}>{account}</option>
              ))}
            </SimpleSelect>
          </Field>
          <Field label="Cuenta de ingreso predeterminada">
            <SimpleSelect
              className="field mt-1.5"
              onChange={(event) => setRevenueAccount(event.target.value)}
              value={revenueAccount}
            >
              {accountOptions.slice(5, 8).map((account) => (
                <option key={account} value={account}>{account}</option>
              ))}
            </SimpleSelect>
          </Field>
          <div className="rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300 sm:col-span-2">
            Estas cuentas se usarán como sugerencia y podrán modificarse en cada venta.
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!name || !rif}
            onClick={() => onCreate({ name, rif, receivableAccount, revenueAccount })}
          >
            Crear cliente
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label">{label}{children}</label>;
}

function BalanceAmount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="max-w-44 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
