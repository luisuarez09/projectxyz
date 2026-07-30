"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { label: "Identidad", icon: Building2 },
  { label: "Legal", icon: Landmark },
  { label: "Servicio", icon: FileText },
  { label: "Accesos", icon: UsersRound },
];

export function NewCompanyWizard() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const StepIcon = current.icon;

  return (
    <>
      <div className="mt-7 grid gap-2 sm:grid-cols-4">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const active = index === step;
          const done = index < step;
          return (
            <button
              aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
                active
                  ? "border-[#14352d] bg-[#14352d] text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-stone-950"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-stone-200 bg-white text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
              }`}
              key={item.label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/10 text-xs font-semibold">
                {done ? <Check size={15} /> : <Icon size={15} />}
              </span>
              <span><span className="block text-xs opacity-70">Paso {index + 1}</span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="mt-5 border-stone-200 shadow-sm dark:border-stone-800">
        <CardHeader className="border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#e8f1ec] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-300"><StepIcon size={19} /></div>
            <div>
              <CardTitle>{step === 0 && "Identidad fiscal"}{step === 1 && "Expediente legal y gobierno corporativo"}{step === 2 && "Plan y alcance del servicio"}{step === 3 && "Accesos y portal del cliente"}</CardTitle>
              <CardDescription className="mt-1">{step === 0 && "Datos base para identificar y administrar la empresa."}{step === 1 && "Registra las fechas que deben vigilarse; los archivos se administran en el expediente."}{step === 2 && "El plan parte de una plantilla, con servicios ajustables por empresa."}{step === 3 && "El portal del cliente se activa mediante invitaciones, nunca con contraseñas visibles."}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 0 && <IdentityStep />}
          {step === 1 && <LegalStep />}
          {step === 2 && <ServiceStep />}
          {step === 3 && <AccessStep />}

          <div className="mt-7 flex items-center justify-between border-t border-stone-100 pt-5 dark:border-stone-800">
            <Button disabled={step === 0} onClick={() => setStep((value) => value - 1)} type="button" variant="outline"><ChevronLeft size={16} /> Anterior</Button>
            {step < steps.length - 1 ? (
              <Button className="bg-[#14352d] hover:bg-[#0e2821] dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400" onClick={() => setStep((value) => value + 1)} type="button">Continuar <ChevronRight size={16} /></Button>
            ) : (
              <Button className="bg-[#14352d] hover:bg-[#0e2821] dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400" type="button"><Check size={16} /> Crear empresa</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function IdentityStep() {
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Razón social" placeholder="Ej. Inversiones ABC, C.A." />
    <Field label="RIF" placeholder="J-00000000-0" />
    <SelectField label="Tipo de contribuyente" options={["Ordinario", "Sujeto pasivo especial", "Exento o exonerado", "Por definir"]} />
    <Field label="Actividad económica" placeholder="Ej. Comercio al mayor" />
    <div className="sm:col-span-2"><Field label="Dirección fiscal" placeholder="Estado, municipio, parroquia, avenida, edificio y referencia" /></div>
    <Field label="Contacto principal" placeholder="Nombre y apellido" />
    <Field label="Correo de contacto" placeholder="correo@empresa.com" type="email" />
    <label className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-800"><input className="size-4 accent-[#14352d]" type="checkbox" /> Esta empresa posee sucursales <span className="text-xs text-stone-500">Opcional; se configuran después.</span></label>
  </div>;
}

function LegalStep() {
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha de constitución" type="date" />
      <Field label="Capital social / estructura patrimonial" placeholder="Ej. Bs. 100.000; 60% / 40%" />
      <Field label="Representante legal" placeholder="Nombre y cargo" />
      <Field label="Junta directiva" placeholder="Presidente, directores…" />
      <Field label="Comisario" placeholder="Nombre o firma" />
      <Field label="Vencimiento del comisario" type="date" />
      <Field label="Próxima asamblea ordinaria" type="date" />
      <Field label="Fecha tope de renovación relevante" type="date" />
    </div>
    <div className="rounded-xl border border-dashed border-[#a8c6b5] bg-[#f4faf6] p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#14352d] dark:text-emerald-200"><FileText size={17} /> Expediente corporativo</p>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">El acta constitutiva, actas de asamblea, nombramientos y soportes se cargan después de crear la empresa en <strong>Documentos corporativos</strong>. Cada documento tendrá responsable, vigencia y alerta de renovación.</p>
    </div>
  </div>;
}

function ServiceStep() {
  return <div className="space-y-5">
    <SelectField label="Plan activo" options={["Esencial — obligaciones básicas", "Tributario — calendario y declaraciones", "Integral — contabilidad y acompañamiento"]} />
    <div>
      <p className="text-sm font-medium">Servicios a controlar</p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Puedes ajustar este alcance sin cambiar la plantilla del plan.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {["Calendario tributario", "IVA y retenciones", "Libros de compras y ventas", "Servicios públicos", "Nómina y parafiscales", "Reportes para el cliente"].map((service, index) => <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-800" key={service}><input className="size-4 accent-[#14352d]" defaultChecked={index < 4} type="checkbox" /> {service}</label>)}
      </div>
    </div>
  </div>;
}

function AccessStep() {
  return <div className="grid gap-4 md:grid-cols-2">
    <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800"><div className="flex gap-3"><div className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><UsersRound size={18} /></div><div><h3 className="font-semibold">Portal del cliente</h3><p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Al crear la empresa, envía una invitación segura al contacto principal. Allí podrá invitarse a otros usuarios con permisos definidos.</p></div></div><p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-300">No se registra contraseña aquí: la persona crea la suya desde su invitación.</p></section>
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20"><div className="flex gap-3"><div className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><LockKeyhole size={18} /></div><div><h3 className="font-semibold">Accesos tributarios restringidos</h3><p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Credenciales de portales y certificados van después en un módulo cifrado, limitado por rol y con registro de auditoría.</p></div></div><p className="mt-4 rounded-lg bg-white/70 p-3 text-xs text-stone-600 dark:bg-stone-950/40 dark:text-stone-300">Nunca visibles para el cliente ni mezcladas con sus datos generales.</p></section>
  </div>;
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder?: string; type?: string }) { return <label className="text-sm font-medium">{label}<input className="field mt-1.5" placeholder={placeholder} type={type} /></label>; }
function SelectField({ label, options }: { label: string; options: string[] }) { return <label className="text-sm font-medium">{label}<select className="field mt-1.5" defaultValue=""><option disabled value="">Selecciona una opción</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
