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
  Check,
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

type Provider = {
  name: string;
  rif: string;
  expenseAccount: string;
  payableAccount: string;
};

type EntrySource = "provider" | "tax" | "counterpart" | "manual";

type AccountingEntry = {
  id: string;
  account: string;
  debit: string;
  credit: string;
  source: EntrySource;
};

const initialProviders: Provider[] = [
  {
    name: "Distribuidora Nacional de Empaques, C.A.",
    rif: "J-405699214",
    expenseAccount: "5.1.01.001 · Gastos de compras",
    payableAccount: "2.1.10.001 · Cuentas por pagar - Proveedores",
  },
  {
    name: "Insumos Occidente, C.A.",
    rif: "J-314889623",
    expenseAccount: "1.1.05.003 · Inventario de materiales",
    payableAccount: "2.1.10.001 · Cuentas por pagar - Proveedores",
  },
];

const genericProvider: Provider = {
  name: "Proveedor sin seleccionar",
  rif: "",
  expenseAccount: "5.1.01.001 · Gastos de compras",
  payableAccount: "2.1.10.001 · Cuentas por pagar - Proveedores",
};

const accountOptions = [
  "5.1.01.001 · Gastos de compras",
  "5.1.01.015 · Gastos de papelería",
  "5.1.01.099 · IVA no deducible",
  "1.1.05.003 · Inventario de materiales",
  "1.1.09.001 · IVA crédito fiscal",
  "2.1.10.001 · Cuentas por pagar - Proveedores",
  "2.1.10.010 · Cuentas por pagar - Relacionadas",
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

function automaticEntries({
  provider,
  taxableBase,
  exemptAmount,
  tax,
  total,
  hasTaxCredit,
}: {
  provider: Provider;
  taxableBase: number;
  exemptAmount: number;
  tax: number;
  total: number;
  hasTaxCredit: boolean;
}): AccountingEntry[] {
  const purchaseCost = hasTaxCredit
    ? taxableBase + exemptAmount
    : total;

  return [
    {
      id: "auto-expense",
      account: provider.expenseAccount,
      debit: amount(purchaseCost),
      credit: "",
      source: "provider",
    },
    ...(hasTaxCredit
      ? [
          {
            id: "auto-tax",
            account: "1.1.09.001 · IVA crédito fiscal",
            debit: amount(tax),
            credit: "",
            source: "tax" as const,
          },
        ]
      : []),
    {
      id: "auto-payable",
      account: provider.payableAccount,
      debit: "",
      credit: amount(total),
      source: "counterpart",
    },
  ];
}

export function PurchaseInvoiceForm() {
  const [providers, setProviders] = useState(initialProviders);
  const [providerQuery, setProviderQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [document, setDocument] = useState("");
  const [date, setDate] = useState("2026-08-01");
  const [currency, setCurrency] = useState("VES");
  const [taxableBase, setTaxableBase] = useState("");
  const [exemptAmount, setExemptAmount] = useState("");
  const [hasTaxCredit, setHasTaxCredit] = useState(true);
  const [fileName, setFileName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [entries, setEntries] = useState<AccountingEntry[]>(() =>
    automaticEntries({
      provider: genericProvider,
      taxableBase: 0,
      exemptAmount: 0,
      tax: 0,
      total: 0,
      hasTaxCredit: true,
    }),
  );

  const providerRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const manualEntryCounter = useRef(0);

  const configuredVatRate = 16;
  const tax = useMemo(
    () => numeric(taxableBase) * (configuredVatRate / 100),
    [taxableBase],
  );
  const total = useMemo(
    () => numeric(taxableBase) + numeric(exemptAmount) + tax,
    [taxableBase, exemptAmount, tax],
  );
  const exemptShare = total > 0 ? (numeric(exemptAmount) / total) * 100 : 0;
  const results = providers.filter((item) =>
    `${item.name} ${item.rif}`.toLowerCase().includes(providerQuery.toLowerCase()),
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
  const canSave = total > 0 && isBalanced;

  const resetAutomaticEntries = useCallback(() => {
    setEntries(
      automaticEntries({
        provider: selectedProvider ?? genericProvider,
        taxableBase: numeric(taxableBase),
        exemptAmount: numeric(exemptAmount),
        tax,
        total,
        hasTaxCredit,
      }),
    );
  }, [exemptAmount, hasTaxCredit, selectedProvider, tax, taxableBase, total]);

  useEffect(() => {
    const nextAutomaticEntries = automaticEntries({
      provider: selectedProvider ?? genericProvider,
      taxableBase: numeric(taxableBase),
      exemptAmount: numeric(exemptAmount),
      tax,
      total,
      hasTaxCredit,
    });

    setEntries((current) => {
      const manualEntries = current.filter((entry) => entry.source === "manual");
      const synchronizedEntries = nextAutomaticEntries.map((entry) => {
        const previous = current.find((candidate) => candidate.id === entry.id);
        return previous ? { ...entry, account: previous.account } : entry;
      });
      return [...synchronizedEntries, ...manualEntries];
    });
  }, [exemptAmount, hasTaxCredit, selectedProvider, tax, taxableBase, total]);

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
    setProviderQuery("");
    setSelectedProvider(null);
    setDocument("");
    setTaxableBase("");
    setExemptAmount("");
    setHasTaxCredit(true);
    setFileName("");
    setSavedMessage("");
    setEntries(
      automaticEntries({
        provider: genericProvider,
        taxableBase: 0,
        exemptAmount: 0,
        tax: 0,
        total: 0,
        hasTaxCredit: true,
      }),
    );
    manualEntryCounter.current = 0;
    requestAnimationFrame(() => providerRef.current?.focus());
  }, []);

  const save = useCallback(
    (next = false) => {
      if (!canSave) return;
      setSavedMessage(
        "Borrador guardado localmente. La persistencia contable se conectará en una fase posterior.",
      );
      if (next) resetForNext();
    },
    [canSave, resetForNext],
  );

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      const actions: Record<string, () => void> = {
        s: () => save(),
        n: () => save(true),
      };
      const action = actions[key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);

  const selectProvider = (item: Provider) => {
    setSelectedProvider(item);
    setProviderQuery(item.name);
    setPickerOpen(false);
    requestAnimationFrame(() => documentRef.current?.focus());
  };

  const createProvider = (item: Provider) => {
    setProviders((current) => [...current, item]);
    selectProvider(item);
    setCreateOpen(false);
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
          href="/operaciones/compras"
        >
          <ArrowLeft size={17} /> Volver a compras
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
          <p className="text-sm text-stone-500">Compras / Nueva factura</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Registrar factura de compra
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Captura el documento y revisa el asiento sugerido antes de guardar.
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
          <Section title="Datos del documento" description="Información fiscal y proveedor asociado.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="field-label relative sm:col-span-2 lg:col-span-4">
                Proveedor *
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
                    <Input
                      aria-expanded={pickerOpen}
                      className="field pl-9"
                      onChange={(event) => {
                        setProviderQuery(event.target.value);
                        setSelectedProvider(null);
                        setPickerOpen(true);
                      }}
                      onClick={() => setPickerOpen(true)}
                      onFocus={() => setPickerOpen(true)}
                      placeholder="Buscar por nombre o RIF"
                      ref={providerRef}
                      value={providerQuery}
                    />
                    {pickerOpen && (
                      <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
                        <p className="px-3 pb-1 pt-3 text-xs font-medium text-stone-500">
                          Proveedores registrados
                        </p>
                        {results.map((item) => (
                          <button
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#f4faf6] dark:hover:bg-stone-800"
                            key={item.rif}
                            onClick={() => selectProvider(item)}
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
                          <p className="px-3 py-3 text-sm text-stone-500">
                            No hay coincidencias.
                          </p>
                        )}
                        <div className="border-t border-stone-100 p-1 dark:border-stone-800">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-[#14352d] hover:bg-[#e7f0e9] dark:text-emerald-300 dark:hover:bg-stone-800"
                            onClick={() => {
                              setPickerOpen(false);
                              setCreateOpen(true);
                            }}
                            type="button"
                          >
                            <Plus size={16} /> Crear proveedor
                            {providerQuery ? `: ${providerQuery}` : ""}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    className="shrink-0"
                    onClick={() => setCreateOpen(true)}
                    type="button"
                    variant="outline"
                  >
                    <Plus /> <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </div>
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Al seleccionar se cargan las cuentas predeterminadas del proveedor.
                </span>
              </div>

              <Field label="N.º de factura *">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => setDocument(event.target.value)}
                  placeholder="Ej.: 00002530"
                  ref={documentRef}
                  value={document}
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
            title="Importes y tratamiento fiscal"
            description="La tasa se toma de la configuración vigente de la empresa; aquí defines la porción gravada y exenta."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CurrencyInput
                label="Base imponible"
                onChange={setTaxableBase}
                prefix={currency}
                value={taxableBase}
              />
              <CurrencyInput
                hint={total > 0 ? `${amount(exemptShare)} % del total` : undefined}
                label="Exento / no gravado"
                onChange={setExemptAmount}
                prefix={currency}
                value={exemptAmount}
              />
              <Field label="Tasa de IVA">
                <div className="mt-1.5 flex h-9 items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 text-sm dark:border-stone-700 dark:bg-stone-800">
                  <span>{configuredVatRate} %</span>
                  <span className="text-xs text-stone-500">Configurada</span>
                </div>
              </Field>
              <CurrencyInput
                label="IVA calculado"
                prefix={currency}
                readOnly
                value={amount(tax)}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <TaxTreatmentOption
                active={hasTaxCredit}
                description="El IVA se carga a la cuenta de crédito fiscal configurada."
                onClick={() => setHasTaxCredit(true)}
                title="Con derecho a crédito fiscal"
              />
              <TaxTreatmentOption
                active={!hasTaxCredit}
                description="El IVA se suma al costo de la compra y no se aprovecha en la declaración."
                onClick={() => setHasTaxCredit(false)}
                title="Sin derecho a crédito fiscal"
                warning
              />
            </div>

            <p className={`mt-3 rounded-lg p-3 text-xs leading-5 ${
              hasTaxCredit
                ? "bg-stone-50 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            }`}>
              {hasTaxCredit
                ? "El IVA se separa como crédito fiscal aprovechable. La procedencia debe revisarse según la regla aplicable y sus soportes."
                : "En la determinación de IVA, esta operación se clasifica como compra sin crédito fiscal: el impuesto forma parte del costo y no se suma a los créditos aprovechables."}
            </p>
          </Section>

          <Section
            title="Distribución contable"
            description="Las cuentas del proveedor y las contrapartidas se sugieren automáticamente. Puedes cambiar cuentas, importes o agregar líneas."
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
                        ? "Ingresa los importes de la factura."
                        : difference < 0
                          ? "Faltan débitos."
                          : "Faltan créditos."}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Section>

          <Section title="Soporte y notas" description="Opcional para este borrador.">
            <AttachmentInput
              accept="image/*,.pdf"
              description="JPG, PNG o PDF"
              fileName={fileName}
              label="Factura de compra"
              onChange={(event) =>
                event.target.files?.[0] && setFileName(event.target.files[0].name)
              }
            />
            <textarea
              className="field mt-4 min-h-20 py-2"
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
            <Row label="Proveedor" value={selectedProvider?.name ?? "Sin seleccionar"} />
            <Row label="RIF" value={selectedProvider?.rif || "—"} />
            <Row label="Factura" value={document || "Sin número"} />
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
            <Row label="Base imponible" value={`${currency} ${amount(numeric(taxableBase))}`} />
            <Row label="Exento / no gravado" value={`${currency} ${amount(numeric(exemptAmount))}`} />
            <Row
              label={hasTaxCredit ? `IVA crédito (${configuredVatRate} %)` : "IVA incluido en la compra"}
              value={`${currency} ${amount(tax)}`}
            />
          </div>
          <div className="my-5 border-t border-stone-200 dark:border-stone-800" />
          <div className="space-y-3 text-sm">
            <Row
              label="IVA aprovechable"
              value={hasTaxCredit ? `${currency} ${amount(tax)}` : `${currency} 0,00`}
            />
            <Row
              label="Asiento"
              value={isBalanced ? "Cuadrado" : `Descuadre ${amount(Math.abs(difference))}`}
            />
          </div>
          <div
            className={`mt-5 rounded-lg p-3 text-xs leading-5 ${
              canSave
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            }`}
          >
            {canSave
              ? "Importes y asiento listos para guardar."
              : "Completa los importes y corrige el descuadre para habilitar el guardado."}
          </div>
        </aside>
      </div>

      {createOpen && (
        <QuickProviderModal
          initialName={providerQuery}
          onClose={() => setCreateOpen(false)}
          onCreate={createProvider}
        />
      )}
    </div>
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
    provider: "Proveedor",
    tax: "Impuesto",
    counterpart: "Contrapartida",
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
        onChange={(value) => onUpdate({ debit: value, ...(numeric(value) ? { credit: "" } : {}) })}
        value={entry.debit}
      />
      <LedgerInput
        currency={currency}
        label="Haber"
        onChange={(value) => onUpdate({ credit: value, ...(numeric(value) ? { debit: "" } : {}) })}
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
      <div className="relative">
        <Input
          aria-label={`${label} en ${currency}`}
          className="field pr-3 text-right tabular-nums"
          inputMode="decimal"
          onChange={(event) => onChange(editableAmount(event.target.value))}
          placeholder="0,00"
          value={value}
        />
      </div>
    </label>
  );
}

function TaxTreatmentOption({
  active,
  description,
  onClick,
  title,
  warning = false,
}: {
  active: boolean;
  description: string;
  onClick: () => void;
  title: string;
  warning?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex gap-3 rounded-xl border p-4 text-left transition ${
        active
          ? warning
            ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/25"
            : "border-[#14352d] bg-[#e7f0e9] dark:border-emerald-700 dark:bg-emerald-950/25"
          : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
          active
            ? warning
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-[#14352d] bg-[#14352d] text-white"
            : "border-stone-300 dark:border-stone-600"
        }`}
      >
        {active && <Check size={13} />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-stone-500">{description}</span>
      </span>
    </button>
  );
}

function QuickProviderModal({
  initialName,
  onClose,
  onCreate,
}: {
  initialName: string;
  onClose: () => void;
  onCreate: (provider: Provider) => void;
}) {
  const [name, setName] = useState(initialName);
  const [rif, setRif] = useState("");
  const [address, setAddress] = useState("");
  const [expenseAccount, setExpenseAccount] = useState(accountOptions[0]);
  const [payableAccount, setPayableAccount] = useState(accountOptions[5]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        <div className="flex justify-between border-b border-stone-100 p-5 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-semibold">Nuevo proveedor</h2>
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
          <Field label="Cuenta de gasto predeterminada">
            <SimpleSelect
              className="field mt-1.5"
              onChange={(event) => setExpenseAccount(event.target.value)}
              value={expenseAccount}
            >
              {accountOptions.slice(0, 4).map((account) => (
                <option key={account} value={account}>{account}</option>
              ))}
            </SimpleSelect>
          </Field>
          <Field label="Cuenta por pagar predeterminada">
            <SimpleSelect
              className="field mt-1.5"
              onChange={(event) => setPayableAccount(event.target.value)}
              value={payableAccount}
            >
              {accountOptions.slice(5, 7).map((account) => (
                <option key={account} value={account}>{account}</option>
              ))}
            </SimpleSelect>
          </Field>
          <div className="rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600 dark:bg-stone-800 dark:text-stone-300 sm:col-span-2">
            Las cuentas se usarán como sugerencia en nuevas compras y podrán modificarse en cada factura.
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-5 dark:border-stone-800">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!name || !rif}
            onClick={() => onCreate({ name, rif, expenseAccount, payableAccount })}
          >
            Crear proveedor
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

function CurrencyInput({
  hint,
  label,
  onChange,
  prefix,
  readOnly = false,
  value,
}: {
  hint?: string;
  label: string;
  onChange?: (value: string) => void;
  prefix: string;
  readOnly?: boolean;
  value: string;
}) {
  return (
    <Field label={label}>
      <div className="relative mt-1.5">
        <span className="absolute left-3 top-2.5 text-xs font-medium text-stone-400">
          {prefix}
        </span>
        <Input
          className={`field pl-11 text-right tabular-nums ${readOnly ? "bg-stone-50 text-stone-600 dark:bg-stone-800" : ""}`}
          inputMode="decimal"
          onChange={(event) => onChange?.(editableAmount(event.target.value))}
          placeholder="0,00"
          readOnly={readOnly}
          value={value}
        />
      </div>
      {hint && <span className="mt-1 block text-xs font-normal text-stone-500">{hint}</span>}
    </Field>
  );
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
