"use client";;
import { AttachmentInput } from "@/components/ui/attachment-input";
import { Building2, Check, FileText, ImagePlus, Mail, MapPin, Phone, Upload } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

const initialFirm = {
  name: "Firma contable proyectoxyz",
  rif: "J-00000000-0",
  address: "Dirección fiscal por completar",
  email: "contacto@firma.com",
  phone: "0414-0000000",
  pdfHeader: "Firma contable proyectoxyz · Servicios contables y tributarios",
  pdfFooter: "Documento emitido desde proyectoxyz",
};

export function FirmGeneralSettings() {
  const [firm, setFirm] = useState(initialFirm);
  const [logoName, setLogoName] = useState("");
  const [saved, setSaved] = useState(false);
  const update = (field: keyof typeof firm, value: string) => { setFirm((current) => ({ ...current, [field]: value })); setSaved(false); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">Configuración de la firma</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">General</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">Datos legales, contacto e identidad que la firma reutilizará en sus documentos exportados.</p>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#14352d] px-4 text-sm font-medium text-white hover:bg-[#0e2821]" onClick={() => setSaved(true)} type="button"><Check size={16} /> Guardar cambios</button>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200"><Building2 size={18} /></span><div><h2 className="font-semibold">Identificación de la firma</h2><p className="mt-1 text-sm text-stone-500">Esta información es independiente de los datos de cada empresa atendida.</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Nombre o razón social<Input className="field mt-1.5" onChange={(event) => update("name", event.target.value)} value={firm.name} /></label>
              <label className="field-label">RIF<Input className="field mt-1.5 uppercase" onChange={(event) => update("rif", event.target.value)} value={firm.rif} /></label>
              <label className="field-label sm:col-span-2">Dirección fiscal<span className="relative mt-1.5 block"><MapPin className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} /><Input className="field pl-9" onChange={(event) => update("address", event.target.value)} value={firm.address} /></span></label>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-semibold">Contacto</h2>
            <p className="mt-1 text-sm text-stone-500">Datos generales que pueden mostrarse en reportes y comprobantes.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Correo<span className="relative mt-1.5 block"><Mail className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} /><Input className="field pl-9" onChange={(event) => update("email", event.target.value)} type="email" value={firm.email} /></span></label>
              <label className="field-label">Número de contacto<span className="relative mt-1.5 block"><Phone className="pointer-events-none absolute left-3 top-2.5 text-stone-400" size={15} /><Input className="field pl-9" onChange={(event) => update("phone", event.target.value)} value={firm.phone} /></span></label>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><FileText size={18} /></span><div><h2 className="font-semibold">Encabezado de documentos PDF</h2><p className="mt-1 text-sm text-stone-500">Texto institucional que acompañará los PDF exportados por la firma.</p></div></div>
            <div className="mt-5 space-y-4">
              <label className="field-label">Encabezado<textarea className="field mt-1.5 min-h-20 py-2" onChange={(event) => update("pdfHeader", event.target.value)} value={firm.pdfHeader} /></label>
              <label className="field-label">Pie de página<Input className="field mt-1.5" onChange={(event) => update("pdfFooter", event.target.value)} value={firm.pdfFooter} /></label>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"><ImagePlus size={18} /></span><div><h2 className="font-semibold">Logo</h2><p className="mt-1 text-sm text-stone-500">PNG, JPG o SVG. Recomendado: fondo transparente.</p></div></div>
            <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 px-5 text-center transition hover:border-[#14352d] hover:bg-[#f4faf6] dark:border-stone-700 dark:hover:bg-emerald-950/30">
              <Upload className="text-[#14352d] dark:text-emerald-300" size={25} />
              <span className="mt-3 text-sm font-medium">{logoName || "Seleccionar logo"}</span>
              <span className="mt-1 text-xs text-stone-500">Máximo recomendado 2 MB</span>
              <AttachmentInput
                accept=".png,.jpg,.jpeg,.svg"
                className="hidden"
                onChange={(event) => { setLogoName(event.target.files?.[0]?.name ?? ""); setSaved(false); }} />
            </label>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800"><h2 className="font-semibold">Vista previa del encabezado</h2><p className="mt-1 text-xs text-stone-500">Referencia visual para futuras exportaciones PDF.</p></div>
            <div className="m-5 aspect-[8.5/5.5] rounded border border-stone-200 bg-white p-5 text-stone-900 shadow-inner">
              <div className="flex items-start justify-between gap-4 border-b border-stone-300 pb-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#14352d] text-sm font-bold text-white">{logoName ? "LOGO" : "PX"}</div>
                <div className="min-w-0 flex-1 text-right"><p className="truncate text-sm font-semibold">{firm.name || "Nombre de la firma"}</p><p className="mt-1 text-[10px] text-stone-500">{firm.rif || "RIF"}</p><p className="text-[10px] text-stone-500">{firm.email || "Correo"} · {firm.phone || "Contacto"}</p></div>
              </div>
              <p className="mt-4 text-[10px] leading-4 text-stone-600">{firm.pdfHeader || "Encabezado del documento"}</p>
              <div className="mt-4 h-2 w-2/3 rounded bg-stone-100" /><div className="mt-2 h-2 w-full rounded bg-stone-100" /><div className="mt-2 h-2 w-5/6 rounded bg-stone-100" />
            </div>
          </section>
        </div>
      </div>
      <div aria-live="polite" className="mt-5 min-h-6">{saved && <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><Check size={15} /> Cambios guardados en esta vista demostrativa. La persistencia se conectará con el backend.</p>}</div>
    </div>
  );
}
