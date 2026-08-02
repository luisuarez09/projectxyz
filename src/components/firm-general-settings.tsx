"use client";

import {
  Building2,
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Coins,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";

type FirmSettings = {
  version: number;
  entityType: "NATURAL_PERSON" | "LEGAL_ENTITY";
  legalName: string;
  tradeName: string;
  rif: string;
  fiscalAddress: string;
  email: string;
  phone: string;
  pdfHeader: string;
  pdfFooter: string;
  archivePaperSize: "LETTER" | "A4" | "LEGAL_OFFICIO";
  exchangeRateSyncStart: string;
  exchangeRateSyncEnd: string;
  exchangeRateSyncInterval: 30 | 60 | 90 | 120;
  currencies: CurrencySetting[];
  logoStoredObject: { id: string; originalName: string; status: string } | null;
};

type CurrencySetting = {
  id?: string;
  code: string;
  name: string;
  symbol: string;
  source: "BCV" | "MANUAL" | "EXTERNAL";
  sourceName: string;
  sourceUrl: string;
  automaticEnabled: boolean;
  active: boolean;
  version?: number;
};

const emptySettings: FirmSettings = {
  version: 1,
  entityType: "NATURAL_PERSON",
  legalName: "",
  tradeName: "",
  rif: "",
  fiscalAddress: "",
  email: "",
  phone: "",
  pdfHeader: "",
  pdfFooter: "",
  archivePaperSize: "LETTER",
  exchangeRateSyncStart: "18:00",
  exchangeRateSyncEnd: "21:00",
  exchangeRateSyncInterval: 30,
  currencies: [],
  logoStoredObject: null,
};

function fromApi(value: Record<string, unknown>): FirmSettings {
  return {
    version: Number(value.version),
    entityType:
      value.entityType === "LEGAL_ENTITY" ? "LEGAL_ENTITY" : "NATURAL_PERSON",
    legalName: String(value.legalName ?? ""),
    tradeName: String(value.tradeName ?? ""),
    rif: String(value.rif ?? ""),
    fiscalAddress: String(value.fiscalAddress ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    pdfHeader: String(value.pdfHeader ?? ""),
    pdfFooter: String(value.pdfFooter ?? ""),
    archivePaperSize:
      value.archivePaperSize === "A4" ||
      value.archivePaperSize === "LEGAL_OFFICIO"
        ? value.archivePaperSize
        : "LETTER",
    exchangeRateSyncStart: String(value.exchangeRateSyncStart ?? "18:00"),
    exchangeRateSyncEnd: String(value.exchangeRateSyncEnd ?? "21:00"),
    exchangeRateSyncInterval: [30, 60, 90, 120].includes(Number(value.exchangeRateSyncInterval))
      ? Number(value.exchangeRateSyncInterval) as FirmSettings["exchangeRateSyncInterval"]
      : 30,
    currencies: Array.isArray(value.currencies)
      ? value.currencies.map((item) => {
        const currency = item as Record<string, unknown>;
        return {
          id: String(currency.id),
          code: String(currency.code ?? ""),
          name: String(currency.name ?? ""),
          symbol: String(currency.symbol ?? ""),
          source: currency.source === "BCV" || currency.source === "EXTERNAL" ? currency.source : "MANUAL",
          sourceName: String(currency.sourceName ?? ""),
          sourceUrl: String(currency.sourceUrl ?? ""),
          automaticEnabled: Boolean(currency.automaticEnabled),
          active: Boolean(currency.active),
          version: Number(currency.version ?? 1),
        } satisfies CurrencySetting;
      })
      : [],
    logoStoredObject:
      value.logoStoredObject as FirmSettings["logoStoredObject"],
  };
}

export function FirmGeneralSettings() {
  const [firm, setFirm] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/firm/general-settings", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "No fue posible cargar la firma.");
        if (active) setFirm(fromApi(body.settings));
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof FirmSettings>(
    field: K,
    value: FirmSettings[K],
  ) => {
    setFirm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  };

  const updateCurrency = <K extends keyof CurrencySetting>(index: number, field: K, value: CurrencySetting[K]) => {
    setFirm((current) => ({
      ...current,
      currencies: current.currencies.map((currency, currencyIndex) => {
        if (currencyIndex !== index) return currency;
        const next = { ...currency, [field]: value };
        if (field === "source" && value !== "BCV") next.automaticEnabled = false;
        if (field === "active" && !value) next.automaticEnabled = false;
        return next;
      }),
    }));
    setMessage("");
    setError("");
  };

  const addCurrency = () => {
    setFirm((current) => ({
      ...current,
      currencies: [...current.currencies, {
        code: "",
        name: "",
        symbol: "",
        source: "MANUAL",
        sourceName: "",
        sourceUrl: "",
        automaticEnabled: false,
        active: true,
      }],
    }));
  };

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/firm/general-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(firm),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar los cambios.");
      setFirm(fromApi(body.settings));
      setMessage("Configuración guardada y registrada en auditoría.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <LoaderCircle className="animate-spin text-stone-400" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            General
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Datos legales y de contacto persistidos para la firma, separados de
            cada empresa atendida.
          </p>
        </div>
        <Button
          className="h-9 bg-[#14352d] px-4 text-white hover:bg-[#0e2821]"
          disabled={saving || Boolean(error && !firm.legalName)}
          onClick={save}
        >
          <Check size={16} /> {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      {(message || error) && (
        <p
          aria-live="polite"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
        >
          {error || message}
        </p>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
                <Building2 size={18} />
              </span>
              <div>
                <h2 className="font-semibold">Identificación de la firma</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Actualmente registrada como persona natural.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de titular">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(event) =>
                    update(
                      "entityType",
                      event.target.value as FirmSettings["entityType"],
                    )
                  }
                  value={firm.entityType}
                >
                  <option value="NATURAL_PERSON">Persona natural</option>
                  <option value="LEGAL_ENTITY">Persona jurídica</option>
                </SimpleSelect>
              </Field>
              <Field label="Nombre o razón social">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => update("legalName", event.target.value)}
                  value={firm.legalName}
                />
              </Field>
              <Field label="Nombre comercial (opcional)">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => update("tradeName", event.target.value)}
                  value={firm.tradeName}
                />
              </Field>
              <Field label="RIF">
                <Input
                  className="field mt-1.5 uppercase"
                  onChange={(event) =>
                    update("rif", event.target.value.toUpperCase())
                  }
                  value={firm.rif}
                />
              </Field>
              <label className="field-label sm:col-span-2">
                Dirección fiscal
                <span className="relative mt-1.5 block">
                  <MapPin
                    className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                    size={15}
                  />
                  <Input
                    className="field pl-9"
                    onChange={(event) =>
                      update("fiscalAddress", event.target.value)
                    }
                    value={firm.fiscalAddress}
                  />
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">Contacto</h2>
            <p className="mt-1 text-sm text-stone-500">
              Datos generales que pueden mostrarse en reportes y comprobantes.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Correo">
                <span className="relative mt-1.5 block">
                  <Mail
                    className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                    size={15}
                  />
                  <Input
                    className="field pl-9"
                    onChange={(event) => update("email", event.target.value)}
                    type="email"
                    value={firm.email}
                  />
                </span>
              </Field>
              <Field label="Número de contacto">
                <span className="relative mt-1.5 block">
                  <Phone
                    className="pointer-events-none absolute left-3 top-2.5 text-stone-400"
                    size={15}
                  />
                  <Input
                    className="field pl-9"
                    onChange={(event) => update("phone", event.target.value)}
                    value={firm.phone}
                  />
                </span>
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
                  <Coins size={18} />
                </span>
                <div>
                  <h2 className="font-semibold">Divisas</h2>
                  <p className="mt-1 text-sm text-stone-500">Monedas disponibles para operaciones y fuente de sus tasas de cambio.</p>
                </div>
              </div>
              <Button className="h-9" onClick={addCurrency} type="button" variant="outline"><Plus size={16} /> Agregar moneda</Button>
            </div>

            <div className="mt-5 grid gap-4 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/60 sm:grid-cols-3">
              <Field label="Consultar desde">
                <Input className="field mt-1.5" onChange={(event) => update("exchangeRateSyncStart", event.target.value)} type="time" value={firm.exchangeRateSyncStart} />
              </Field>
              <Field label="Consultar hasta">
                <Input className="field mt-1.5" onChange={(event) => update("exchangeRateSyncEnd", event.target.value)} type="time" value={firm.exchangeRateSyncEnd} />
              </Field>
              <Field label="Frecuencia">
                <SimpleSelect className="field mt-1.5" onChange={(event) => update("exchangeRateSyncInterval", Number(event.target.value) as FirmSettings["exchangeRateSyncInterval"])} value={String(firm.exchangeRateSyncInterval)}>
                  <option value="30">Cada 30 minutos</option>
                  <option value="60">Cada hora</option>
                  <option value="90">Cada 90 minutos</option>
                  <option value="120">Cada 2 horas</option>
                </SimpleSelect>
              </Field>
              <p className="text-xs leading-5 text-stone-500 sm:col-span-3">El horario usa la zona America/Caracas. La consulta automática solo aplica a monedas activas conectadas al BCV.</p>
            </div>

            <div className="mt-5 space-y-3">
              {firm.currencies.map((currency, index) => (
                <div className={`rounded-xl border p-4 ${currency.active ? "border-stone-200 dark:border-stone-700" : "border-stone-200 bg-stone-50 opacity-70 dark:border-stone-800 dark:bg-stone-800/40"}`} key={currency.id ?? `new-${index}`}>
                  <div className="grid gap-4 sm:grid-cols-[100px_minmax(160px,1fr)_100px_minmax(180px,1fr)]">
                    <Field label="Código ISO">
                      <Input className="field mt-1.5 uppercase" disabled={Boolean(currency.id)} maxLength={3} onChange={(event) => updateCurrency(index, "code", event.target.value.toUpperCase())} placeholder="USD" value={currency.code} />
                    </Field>
                    <Field label="Nombre">
                      <Input className="field mt-1.5" onChange={(event) => updateCurrency(index, "name", event.target.value)} placeholder="Dólar estadounidense" value={currency.name} />
                    </Field>
                    <Field label="Símbolo">
                      <Input className="field mt-1.5" maxLength={8} onChange={(event) => updateCurrency(index, "symbol", event.target.value)} placeholder="$" value={currency.symbol} />
                    </Field>
                    <Field label="Fuente de consulta">
                      <SimpleSelect className="field mt-1.5" onChange={(event) => updateCurrency(index, "source", event.target.value as CurrencySetting["source"])} value={currency.source}>
                        <option value="BCV">Banco Central de Venezuela</option>
                        <option value="MANUAL">Registro manual</option>
                        <option value="EXTERNAL">Otra fuente</option>
                      </SimpleSelect>
                    </Field>
                  </div>
                  {currency.source === "EXTERNAL" && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Nombre de la fuente"><Input className="field mt-1.5" onChange={(event) => updateCurrency(index, "sourceName", event.target.value)} placeholder="Nombre del proveedor o institución" value={currency.sourceName} /></Field><Field label="Enlace de consulta"><Input className="field mt-1.5" onChange={(event) => updateCurrency(index, "sourceUrl", event.target.value)} placeholder="https://..." type="url" value={currency.sourceUrl} /></Field></div>}
                  <div className="mt-4 flex flex-wrap gap-5 border-t border-stone-100 pt-4 text-sm dark:border-stone-800">
                    <label className="inline-flex items-center gap-2"><input checked={currency.active} className="size-4 accent-[#14352d]" onChange={(event) => updateCurrency(index, "active", event.target.checked)} type="checkbox" /> Disponible en el sistema</label>
                    <label className={`inline-flex items-center gap-2 ${currency.source !== "BCV" || !currency.active ? "text-stone-400" : ""}`}><input checked={currency.automaticEnabled} className="size-4 accent-[#14352d]" disabled={currency.source !== "BCV" || !currency.active} onChange={(event) => updateCurrency(index, "automaticEnabled", event.target.checked)} type="checkbox" /> Consulta automática</label>
                    {currency.source === "BCV" && <span className="text-xs text-stone-500">BCV disponible para USD, EUR, CNY, TRY y RUB.</span>}
                  </div>
                </div>
              ))}
              {!firm.currencies.length && <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700">Agrega al menos una moneda para guardar la configuración.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <FileText size={18} />
              </span>
              <div>
                <h2 className="font-semibold">Textos de documentos PDF</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Estos textos ya quedan persistidos; la generación definitiva
                  de PDF se conectará con cada reporte.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <Field label="Tamaño de hoja para expedientes">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(event) =>
                    update(
                      "archivePaperSize",
                      event.target.value as FirmSettings["archivePaperSize"],
                    )
                  }
                  value={firm.archivePaperSize}
                >
                  <option value="LETTER">Carta (8,5 × 11 pulg.)</option>
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="LEGAL_OFFICIO">
                    Legal / Oficio (8,5 × 13 pulg.)
                  </option>
                </SimpleSelect>
                <span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">
                  Se aplica a portada, índice y todas las páginas consolidadas
                  del archivo físico.
                </span>
              </Field>
              <Field label="Encabezado">
                <textarea
                  className="field mt-1.5 min-h-20 py-2"
                  onChange={(event) => update("pdfHeader", event.target.value)}
                  value={firm.pdfHeader}
                />
              </Field>
              <Field label="Pie de página">
                <Input
                  className="field mt-1.5"
                  onChange={(event) => update("pdfFooter", event.target.value)}
                  value={firm.pdfFooter}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <ImagePlus size={18} />
              </span>
              <div>
                <h2 className="font-semibold">Logo institucional</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Se almacenará como archivo privado, no dentro de PostgreSQL.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border-2 border-dashed border-stone-300 px-5 py-8 text-center dark:border-stone-700">
              <ImagePlus className="mx-auto text-stone-400" size={26} />
              <p className="mt-3 text-sm font-medium">
                {firm.logoStoredObject?.originalName ?? "Sin logo cargado"}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                La referencia de base de datos ya está preparada. La carga se
                habilitará junto al flujo privado de documentos y ClamAV.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
              <h2 className="font-semibold">Vista previa</h2>
              <p className="mt-1 text-xs text-stone-500">
                Construida con los datos actualmente guardados.
              </p>
            </div>
            <div className="m-5 aspect-[8.5/5.5] rounded border border-stone-200 bg-white p-5 text-stone-900 shadow-inner">
              <div className="flex items-start justify-between gap-4 border-b border-stone-300 pb-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">
                  PX
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-semibold">
                    {firm.legalName || "Nombre de la firma"}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-500">
                    {firm.rif || "RIF"}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    {firm.email || "Correo"}
                    {firm.phone ? ` · ${firm.phone}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-4 text-stone-600">
                {firm.pdfHeader || "Encabezado del documento"}
              </p>
              <div className="mt-4 h-2 w-2/3 rounded bg-stone-100" />
              <div className="mt-2 h-2 w-full rounded bg-stone-100" />
              <div className="mt-2 h-2 w-5/6 rounded bg-stone-100" />
            </div>
          </section>

          <section className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <ShieldCheck className="mt-0.5 shrink-0" size={18} />
            <p className="leading-6">
              Cada guardado usa control de versión y auditoría. El correo
              transaccional se administra por separado en{" "}
              <Link
                className="font-semibold underline"
                href="/configuracion/correo"
              >
                Correo
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="field-label">
      {label}
      {children}
    </label>
  );
}
