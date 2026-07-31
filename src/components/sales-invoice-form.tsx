"use client";;
import { AttachmentInput } from "@/components/ui/attachment-input";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileUp,
  Keyboard,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { type DragEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Kbd } from "@/components/ui/kbd";

type Customer = { name: string; rif: string };
type RetentionType = "none" | "IVA" | "ISLR";

const initialCustomers: Customer[] = [
  { name: "Comercializadora San Miguel, C.A.", rif: "J-401256789" },
  { name: "Alimentos La Montaña, C.A.", rif: "J-308774521" },
];

const numeric = (value: string) => Number(value.replaceAll(".", "").replace(",", ".")) || 0;
const amount = (value: number) =>
  value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SalesInvoiceForm() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [customer, setCustomer] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState("2026-07-30");
  const [currency, setCurrency] = useState("VES");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [retentionFile, setRetentionFile] = useState<File | null>(null);
  const [retentionType, setRetentionType] = useState<RetentionType>("none");
  const [retentionReceipt, setRetentionReceipt] = useState("");
  const [retentionDate, setRetentionDate] = useState("2026-07-30");
  const [retentionPercentage, setRetentionPercentage] = useState<75 | 100>(75);
  const [islrAmount, setIslrAmount] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const configuredVatRate = 16;
  const subtotal = useMemo(() => numeric(quantity) * numeric(price), [quantity, price]);
  const tax = subtotal * configuredVatRate / 100;
  const total = subtotal + tax;
  const results = customers.filter((item) =>
    `${item.name} ${item.rif}`.toLowerCase().includes(customer.toLowerCase()),
  );
  const ivaReceiptIsValid = /^\d{15}$/.test(retentionReceipt);
  const retentionAmount =
    retentionType === "IVA"
      ? tax * retentionPercentage / 100
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

  const resetForNext = () => {
    setCustomer("");
    setInvoice("");
    setDescription("");
    setPrice("");
    setInvoiceFile(null);
    setRetentionFile(null);
    setRetentionType("none");
    setRetentionReceipt("");
    setIslrAmount("");
  };

  const save = (next = false) => {
    if (!retentionIsComplete) return;
    setSavedMessage(
      retentionType === "none"
        ? "Factura guardada localmente."
        : "Factura y retención recibida guardadas localmente.",
    );
    if (next) resetForNext();
  };

  const select = (item: Customer) => {
    setCustomer(item.name);
    setPickerOpen(false);
  };

  const create = (item: Customer) => {
    setCustomers((current) => [...current, item]);
    select(item);
    setNewCustomerOpen(false);
  };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        save(true);
      }
    };
    addEventListener("keydown", shortcut);
    return () => removeEventListener("keydown", shortcut);
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-[#14352d]"
          href="/operaciones/ventas"
        >
          <ArrowLeft size={17} /> Volver a ventas
        </Link>
        <span className="flex items-center gap-2 text-xs text-stone-500">
          <Keyboard size={14} />
          <span className="hidden items-center gap-1 sm:flex"><Kbd>Alt</Kbd> + <Kbd>S</Kbd> guardar · <Kbd>Alt</Kbd> + <Kbd>N</Kbd> guardar y nuevo</span>
        </span>
      </div>
      <div className="mt-5 flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-stone-500">Ventas / Nueva factura</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Registrar factura de venta</h1>
        </div>
        <div className="flex gap-2">
          <Button disabled={!retentionIsComplete} onClick={() => save()} variant="outline">
            <Save /> Guardar
          </Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!retentionIsComplete}
            onClick={() => save(true)}
          >
            Guardar y nuevo
          </Button>
        </div>
      </div>
      {savedMessage && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={17} /> {savedMessage}
        </p>
      )}
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Documento</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="field-label relative sm:col-span-2">
                Cliente *
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
                    <Input
                      aria-expanded={pickerOpen}
                      className="field pl-9"
                      onChange={(event) => {
                        setCustomer(event.target.value);
                        setPickerOpen(true);
                      }}
                      onFocus={() => setPickerOpen(true)}
                      placeholder="Buscar por nombre o RIF"
                      value={customer}
                    />
                    {pickerOpen && (
                      <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                        <p className="px-3 pb-1 pt-3 text-xs font-medium text-stone-500">Clientes registrados</p>
                        {results.map((item) => (
                          <button
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-[#f4faf6]"
                            key={item.rif}
                            onClick={() => select(item)}
                            type="button"
                          >
                            <span>
                              <span className="block text-sm font-medium">{item.name}</span>
                              <span className="text-xs text-stone-500">{item.rif}</span>
                            </span>
                            <span className="text-xs text-[#14352d]">Seleccionar</span>
                          </button>
                        ))}
                        <div className="border-t border-stone-100 p-1">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-[#14352d] hover:bg-[#e7f0e9]"
                            onClick={() => {
                              setPickerOpen(false);
                              setNewCustomerOpen(true);
                            }}
                            type="button"
                          >
                            <Plus size={16} /> Crear cliente{customer ? `: ${customer}` : ""}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button className="shrink-0" onClick={() => setNewCustomerOpen(true)} type="button" variant="outline">
                    <Plus /> <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </div>
                <span className="mt-1 block text-xs font-normal text-stone-500">
                  Busca y selecciona, o crea un cliente sin salir de esta factura.
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
              <Field label="Fecha">
                <div className="relative mt-1.5">
                  <DatePicker
                    className="field"
                    onChange={(event) => setDate(event.target.value)}
                    value={date} />
                  <CalendarDays className="absolute right-3 top-2.5 text-stone-400" size={16} />
                </div>
              </Field>
              <Field label="Moneda">
                <SimpleSelect className="field mt-1.5" onChange={(event) => setCurrency(event.target.value)} value={currency}>
                  <option>VES</option>
                  <option>USD</option>
                </SimpleSelect>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Detalle de ítems</h2>
                <p className="mt-1 text-sm text-stone-500">Los impuestos vienen de la configuración vigente.</p>
              </div>
              <Button size="sm" variant="outline"><Plus /> Ítem</Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_auto]">
              <Field label="Descripción">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Producto o servicio"
                  value={description}
                />
              </Field>
              <Field label="Cantidad">
                <Input
                  className="field mt-1.5 text-right"
                  inputMode="decimal"
                  onChange={(event) => setQuantity(event.target.value)}
                  value={quantity}
                />
              </Field>
              <Field label="Precio">
                <Input
                  className="field mt-1.5 text-right"
                  inputMode="decimal"
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0,00"
                  value={price}
                />
              </Field>
              <div className="pt-7 text-right">
                <p className="text-xs text-stone-500">Total</p>
                <p className="font-medium">{amount(subtotal)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="text-sm text-stone-500">Regla de IVA vigente · {configuredVatRate} %</span>
              <Button aria-label="Eliminar ítem" className="text-rose-600" size="icon-sm" variant="ghost">
                <Trash2 size={16} />
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold">Soportes de la venta</h2>
              <p className="mt-1 text-sm text-stone-500">
                Puedes cargar los documentos ahora o agregarlos posteriormente. Ningún archivo es obligatorio.
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FileDropzone
                file={invoiceFile}
                label="Factura de venta"
                onFile={setInvoiceFile}
              />
              <FileDropzone
                file={retentionFile}
                label="Comprobante de retención"
                onFile={setRetentionFile}
              />
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold">Retención recibida</h2>
                <p className="mt-1 max-w-2xl text-sm text-stone-500">
                  Si el comprobante viene en la carpeta, registra la retención junto con esta factura. También podrás hacerlo después.
                </p>
              </div>
              <SimpleSelect
                className="field sm:w-52"
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
              <div className="mt-5 space-y-4 border-t border-stone-100 pt-5">
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
                      placeholder={retentionType === "IVA" ? "202607000000000" : "Número del comprobante"}
                      value={retentionReceipt}
                    />
                    {retentionType === "IVA" && (
                      <span
                        className={`mt-1 block text-xs font-normal ${
                          retentionReceipt && !ivaReceiptIsValid ? "text-rose-600" : "text-stone-500"
                        }`}
                      >
                        Debe contener 15 dígitos. Ejemplo: 202607000000000.
                      </span>
                    )}
                  </Field>
                  <Field label="Fecha del comprobante">
                    <DatePicker
                      className="field mt-1.5"
                      onChange={(event) => setRetentionDate(event.target.value)}
                      value={retentionDate} />
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
                              ? "border-[#14352d] bg-[#e7f0e9]"
                              : "border-stone-200 hover:bg-stone-50"
                          }`}
                          key={value}
                          onClick={() => setRetentionPercentage(value as 75 | 100)}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">{value} % del IVA</span>
                          <span className="mt-1 block text-xs text-stone-500">
                            Monto: {currency} {amount(tax * value / 100)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <Field label="Monto retenido según comprobante">
                      <Input
                        className="field mt-1.5 text-right"
                        inputMode="decimal"
                        onChange={(event) => setIslrAmount(event.target.value)}
                        placeholder="0,00"
                        value={islrAmount}
                      />
                    </Field>
                    <p className="mt-2 text-xs leading-5 text-amber-800">
                      El cálculo automático se habilitará cuando estén configurados el concepto, porcentaje, sustraendo, fuente y vigencia.
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  La retención quedará vinculada a esta factura por {currency} {amount(retentionAmount)}. El archivo adjunto es opcional.
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Notas</h2>
            <textarea className="field mt-4 min-h-22 py-2" placeholder="Observaciones internas (opcional)" />
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-22">
          <p className="text-sm font-semibold">Revisión</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Cliente" value={customer || "Sin seleccionar"} />
            <Row label="Factura" value={invoice || "Sin número"} />
            <Row label="Fecha" value={date.split("-").reverse().join("/")} />
          </dl>
          <div className="my-5 border-t" />
          <p className="text-xs font-medium uppercase text-stone-500">Total factura</p>
          <p className="mt-1 text-2xl font-semibold">{currency} {amount(total)}</p>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Base gravable" value={`${currency} ${amount(subtotal)}`} />
            <Row label="IVA" value={`${currency} ${amount(tax)}`} />
            <Row label="Exento" value={`${currency} 0,00`} />
          </div>
          <div className="my-5 border-t" />
          <div className="space-y-2 text-sm">
            <Row label="Factura adjunta" value={invoiceFile ? "Sí" : "Pendiente"} />
            <Row label="Retención" value={retentionType === "none" ? "No indicada" : retentionType} />
            {retentionType !== "none" && (
              <Row label="Monto retenido" value={`${currency} ${amount(retentionAmount)}`} />
            )}
            <Row label="Soporte retención" value={retentionFile ? "Sí" : "Opcional"} />
          </div>
        </aside>
      </div>
      {newCustomerOpen && (
        <QuickCustomerModal
          initialName={customer}
          onClose={() => setNewCustomerOpen(false)}
          onCreate={create}
        />
      )}
    </div>
  );
}

function FileDropzone({
  file,
  label,
  onFile,
}: {
  file: File | null;
  label: string;
  onFile: (file: File | null) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const receiveFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div
      className={`rounded-xl transition ${dragging ? "ring-2 ring-[#14352d]/30" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={receiveFile}
    >
      <AttachmentInput
        accept=".pdf,image/*"
        description="Arrastra PDF o imagen, o selecciónala · Opcional"
        fileName={file?.name}
        label={label}
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
    </div>
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

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-stone-950/35 p-4" role="dialog">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-between border-b border-stone-100 p-5">
          <div>
            <h2 className="text-lg font-semibold">Nuevo cliente</h2>
            <p className="mt-1 text-sm text-stone-500">Crea lo esencial y vuelve directamente a la factura.</p>
          </div>
          <Button aria-label="Cerrar" onClick={onClose} size="icon-sm" variant="ghost"><X /></Button>
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
            <span className="mt-1 block text-xs font-normal text-stone-500">Consulta pendiente de integración.</span>
          </Field>
          <Field label="Nombre legal *">
            <Input className="field mt-1.5" onChange={(event) => setName(event.target.value)} value={name} />
          </Field>
          <Field label="Dirección fiscal">
            <textarea className="field mt-1.5 h-20 py-2" onChange={(event) => setAddress(event.target.value)} value={address} />
          </Field>
          <Field label="Cuenta de ingresos predeterminada">
            <SimpleSelect className="field mt-1.5"><option>4.1.01.001 · Ingresos por ventas</option></SimpleSelect>
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-5">
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button
            className="bg-[#14352d] hover:bg-[#0e2821]"
            disabled={!name || !rif}
            onClick={() => onCreate({ name, rif })}
          >
            Crear cliente
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label">{label}{children}</label>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="max-w-40 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
