"use client";

import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  LockKeyhole,
  Minus,
  Plus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCompanyContext } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  emptyCompanyForm,
  offeringAppliesToCompany,
  type CompanyFormData,
  type CompanyOfferingOption,
} from "@/modules/companies/domain/company";

const steps = [
  { label: "Identidad", icon: Building2 },
  { label: "Legal", icon: Landmark },
  { label: "Servicio", icon: FileText },
  { label: "Accesos", icon: UsersRound },
];

export function NewCompanyWizard() {
  const router = useRouter();
  const { canManage, offerings, refresh, staff } = useCompanyContext();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CompanyFormData>(() => ({
    ...emptyCompanyForm,
    branches: [],
    officers: [],
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = steps[step];
  const StepIcon = current.icon;
  const update = <K extends keyof CompanyFormData>(
    key: K,
    value: CompanyFormData[K],
  ) => setForm((state) => ({ ...state, [key]: value }));
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    setForm((current) => {
      const allowedTaxKeys = new Set(
        offerings
          .filter(
            (offering) =>
              offering.kind === "TAX" &&
              offeringAppliesToCompany(offering, current.taxpayerType),
          )
          .map(({ id }) => id),
      );
      const taxOfferingKeys = current.taxOfferingKeys.filter((key) =>
        allowedTaxKeys.has(key),
      );
      return taxOfferingKeys.length === current.taxOfferingKeys.length
        ? current
        : { ...current, taxOfferingKeys };
    });
  }, [offerings, form.taxpayerType]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const allowedTaxKeys = new Set(
        offerings
          .filter(
            (offering) =>
              offering.kind === "TAX" &&
              offeringAppliesToCompany(offering, form.taxpayerType),
          )
          .map(({ id }) => id),
      );
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          taxOfferingKeys: form.taxOfferingKeys.filter((key) =>
            allowedTaxKeys.has(key),
          ),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible crear la empresa.");
      await refresh();
      router.push("/configuracion/empresa");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible crear la empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canManage)
    return (
      <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Tu cuenta no tiene permiso para crear empresas.
      </div>
    );

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
              className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${active ? "border-[#14352d] bg-[#14352d] text-white" : done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-white text-stone-500 dark:border-stone-800 dark:bg-stone-900"}`}
              key={item.label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/10 text-xs font-semibold">
                {done ? <Check size={15} /> : <Icon size={15} />}
              </span>
              <span>
                <span className="block text-xs opacity-70">
                  Paso {index + 1}
                </span>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <Card className="mt-5 border-stone-200 shadow-sm dark:border-stone-800">
        <CardHeader className="border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#e8f1ec] text-[#14352d]">
              <StepIcon size={19} />
            </div>
            <div>
              <CardTitle>
                {
                  [
                    "Identidad y registros",
                    "Expediente legal",
                    "Cobertura e INCES",
                    "Accesos",
                  ][step]
                }
              </CardTitle>
              <CardDescription className="mt-1">
                Todos estos datos formarán la misma ficha que luego editarás en
                Configuración de empresa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 0 && (
            <IdentityStep form={form} staff={staff} update={update} />
          )}
          {step === 1 && <LegalStep form={form} update={update} />}
          {step === 2 && (
            <ServiceStep form={form} offerings={offerings} update={update} />
          )}
          {step === 3 && <AccessStep form={form} update={update} />}
          {error && (
            <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          )}
          <div className="mt-7 flex items-center justify-between border-t border-stone-100 pt-5 dark:border-stone-800">
            <Button
              disabled={step === 0 || saving}
              onClick={() => setStep((value) => value - 1)}
              variant="outline"
            >
              <ChevronLeft size={16} /> Anterior
            </Button>
            {step < steps.length - 1 ? (
              <Button
                className="bg-[#14352d] hover:bg-[#0e2821]"
                onClick={() => setStep((value) => value + 1)}
              >
                Continuar <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                className="bg-[#14352d] hover:bg-[#0e2821]"
                disabled={saving || !form.legalName.trim() || !form.rif.trim()}
                onClick={() => void submit()}
              >
                <Check size={16} />{" "}
                {saving ? "Creando…" : "Crear y activar empresa"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

type Update = <K extends keyof CompanyFormData>(
  key: K,
  value: CompanyFormData[K],
) => void;

function IdentityStep({
  form,
  staff,
  update,
}: {
  form: CompanyFormData;
  staff: { id: string; name: string }[];
  update: Update;
}) {
  const addBranch = () =>
    update("branches", [...form.branches, { name: "", code: "", address: "" }]);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Razón social"
          required
          value={form.legalName}
          onChange={(value) => update("legalName", value)}
          placeholder="Ej. Inversiones ABC, C.A."
        />
        <TextField
          label="Nombre comercial"
          value={form.tradeName}
          onChange={(value) => update("tradeName", value)}
        />
        <TextField
          label="RIF"
          required
          value={form.rif}
          onChange={(value) => update("rif", value)}
          placeholder="J-00000000-0"
        />
        <SelectField
          label="Tipo de contribuyente"
          value={form.taxpayerType}
          onChange={(value) => update("taxpayerType", value)}
          options={[
            "Ordinario",
            "Formal",
            "Sujeto pasivo especial",
            "Exento o exonerado",
            "Por definir",
          ]}
        />
        <TextField
          label="Actividad económica"
          value={form.activity}
          onChange={(value) => update("activity", value)}
        />
        <label className="text-sm font-medium">
          Contador responsable
          <SimpleSelect
            className="field mt-1.5"
            onChange={(event) =>
              update("responsibleProfileId", event.target.value)
            }
            value={form.responsibleProfileId}
          >
            <option value="">Sin asignar</option>
            {staff.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </SimpleSelect>
        </label>
        <div className="sm:col-span-2">
          <TextField
            label="Domicilio fiscal"
            value={form.fiscalAddress}
            onChange={(value) => update("fiscalAddress", value)}
          />
        </div>
        <TextField
          label="Contacto principal"
          value={form.contactName}
          onChange={(value) => update("contactName", value)}
        />
        <TextField
          label="Correo de contacto"
          type="email"
          value={form.contactEmail}
          onChange={(value) => update("contactEmail", value)}
        />
        <TextField
          label="Teléfono de contacto"
          value={form.contactPhone}
          onChange={(value) => update("contactPhone", value)}
        />
        <TextField
          label="Número patronal · IVSS"
          value={form.ivssEmployerNumber}
          onChange={(value) => update("ivssEmployerNumber", value)}
        />
        <TextField
          label="N.º de afiliación · FAOV"
          value={form.faovPayrollNumber}
          onChange={(value) => update("faovPayrollNumber", value)}
        />
      </div>
      <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Sucursales</p>
            <p className="mt-1 text-xs text-stone-500">
              Déjalo vacío si la empresa solo tiene casa matriz.
            </p>
          </div>
          <Button onClick={addBranch} size="sm" variant="outline">
            <Plus size={15} /> Añadir
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {form.branches.map((branch, index) => (
            <div
              className="grid gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-[1fr_.6fr_2fr_auto] dark:bg-stone-900"
              key={index}
            >
              <TextField
                label="Nombre"
                value={branch.name}
                onChange={(value) =>
                  update(
                    "branches",
                    form.branches.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: value } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Código"
                value={branch.code}
                onChange={(value) =>
                  update(
                    "branches",
                    form.branches.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, code: value } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Dirección"
                value={branch.address}
                onChange={(value) =>
                  update(
                    "branches",
                    form.branches.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, address: value } : item,
                    ),
                  )
                }
              />
              <Button
                aria-label={`Eliminar sucursal ${index + 1}`}
                className="self-end"
                onClick={() =>
                  update(
                    "branches",
                    form.branches.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                size="icon"
                variant="ghost"
              >
                <Minus size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LegalStep({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
  const addOfficer = () =>
    update("officers", [
      ...form.officers,
      { position: "", fullName: "", termStartsAt: "", termEndsAt: "" },
    ]);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="Fecha de constitución"
          value={form.incorporationDate}
          onChange={(value) => update("incorporationDate", value)}
        />
        <TextField
          label="Registro mercantil"
          value={form.commercialRegistry}
          onChange={(value) => update("commercialRegistry", value)}
        />
        <TextField
          label="Folio"
          value={form.registryFolio}
          onChange={(value) => update("registryFolio", value)}
        />
        <TextField
          label="Documento / tomo"
          value={form.registryDocument}
          onChange={(value) => update("registryDocument", value)}
        />
        <TextField
          label="Capital social vigente"
          value={form.shareCapital}
          onChange={(value) => update("shareCapital", value)}
        />
      </div>
      <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Junta directiva</p>
            <p className="mt-1 text-xs text-stone-500">
              Registra cargos, personas y vigencia según el documento legal.
            </p>
          </div>
          <Button onClick={addOfficer} size="sm" variant="outline">
            <Plus size={15} /> Añadir cargo
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {form.officers.map((officer, index) => (
            <div
              className="grid gap-3 rounded-lg bg-stone-50 p-3 md:grid-cols-[1fr_1fr_.8fr_.8fr_auto] dark:bg-stone-900"
              key={index}
            >
              <TextField
                label="Cargo"
                value={officer.position}
                onChange={(value) =>
                  update(
                    "officers",
                    form.officers.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, position: value } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Nombre completo"
                value={officer.fullName}
                onChange={(value) =>
                  update(
                    "officers",
                    form.officers.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, fullName: value } : item,
                    ),
                  )
                }
              />
              <DateField
                label="Desde"
                value={officer.termStartsAt}
                onChange={(value) =>
                  update(
                    "officers",
                    form.officers.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, termStartsAt: value }
                        : item,
                    ),
                  )
                }
              />
              <DateField
                label="Hasta"
                value={officer.termEndsAt}
                onChange={(value) =>
                  update(
                    "officers",
                    form.officers.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, termEndsAt: value }
                        : item,
                    ),
                  )
                }
              />
              <Button
                aria-label={`Eliminar cargo ${index + 1}`}
                className="self-end"
                onClick={() =>
                  update(
                    "officers",
                    form.officers.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                size="icon"
                variant="ghost"
              >
                <Minus size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceStep({
  form,
  offerings,
  update,
}: {
  form: CompanyFormData;
  offerings: CompanyOfferingOption[];
  update: Update;
}) {
  const firmTaxOfferings = offerings.filter(
    (offering) =>
      offering.kind === "TAX" &&
      offeringAppliesToCompany(offering, form.taxpayerType),
  );
  const firmServiceOfferings = offerings.filter(
    ({ kind }) => kind === "SERVICE",
  );
  const toggle = (key: "taxOfferingKeys" | "serviceOfferingKeys", id: string) =>
    update(
      key,
      form[key].includes(id)
        ? form[key].filter((value) => value !== id)
        : [...form[key], id],
    );
  return (
    <div className="space-y-6">
      <SelectField
        label="Plan activo"
        value={form.servicePlan}
        onChange={(value) => update("servicePlan", value)}
        options={["Esencial", "Tributario", "Integral"]}
      />
      <OfferingGrid
        items={firmTaxOfferings}
        selected={form.taxOfferingKeys}
        title="Obligaciones tributarias"
        onToggle={(id) => toggle("taxOfferingKeys", id)}
      />
      <OfferingGrid
        items={firmServiceOfferings}
        selected={form.serviceOfferingKeys}
        title="Servicios"
        onToggle={(id) => toggle("serviceOfferingKeys", id)}
      />
      {form.taxOfferingKeys.includes("municipal") && (
        <MunicipalActivities form={form} update={update} />
      )}
      {form.taxOfferingKeys.includes("inces") && (
        <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <p className="font-semibold">Datos particulares de INCES</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="N.º de RNCP"
              value={form.incesRncp}
              onChange={(value) => update("incesRncp", value)}
            />
            <TextField
              label="Representante legal"
              value={form.legalRepresentativeName}
              onChange={(value) => update("legalRepresentativeName", value)}
            />
            <TextField
              label="Cédula del representante"
              value={form.legalRepresentativeDocument}
              onChange={(value) => update("legalRepresentativeDocument", value)}
            />
            <TextField
              label="Teléfono"
              value={form.legalRepresentativePhone}
              onChange={(value) => update("legalRepresentativePhone", value)}
            />
            <TextField
              label="Correo"
              type="email"
              value={form.legalRepresentativeEmail}
              onChange={(value) => update("legalRepresentativeEmail", value)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function MunicipalActivities({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
  const add = () =>
    update("municipalActivities", [
      ...form.municipalActivities,
      {
        branchName: "",
        jurisdiction: "",
        economicActivity: "",
        rate: "",
        effectiveFrom: "",
        source: "",
      },
    ]);
  const change = (
    index: number,
    key: keyof CompanyFormData["municipalActivities"][number],
    value: string,
  ) =>
    update(
      "municipalActivities",
      form.municipalActivities.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Factores municipales por actividad</p>
          <p className="mt-1 text-xs text-stone-600">
            Cada factor exige jurisdicción, vigencia y fuente verificable.
          </p>
        </div>
        <Button onClick={add} size="sm" variant="outline">
          <Plus size={15} /> Añadir factor
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {form.municipalActivities.map((item, index) => (
          <div
            className="grid gap-3 rounded-lg bg-white p-3 md:grid-cols-3"
            key={index}
          >
            <TextField
              label="Sucursal"
              value={item.branchName}
              onChange={(value) => change(index, "branchName", value)}
            />
            <TextField
              label="Jurisdicción"
              value={item.jurisdiction}
              onChange={(value) => change(index, "jurisdiction", value)}
            />
            <TextField
              label="Actividad económica"
              value={item.economicActivity}
              onChange={(value) => change(index, "economicActivity", value)}
            />
            <TextField
              label="Factor (%)"
              value={item.rate}
              onChange={(value) => change(index, "rate", value)}
            />
            <DateField
              label="Aplicar desde"
              value={item.effectiveFrom}
              onChange={(value) => change(index, "effectiveFrom", value)}
            />
            <TextField
              label="Ordenanza o fuente"
              value={item.source}
              onChange={(value) => change(index, "source", value)}
            />
            <Button
              className="md:col-start-3"
              onClick={() =>
                update(
                  "municipalActivities",
                  form.municipalActivities.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
              variant="ghost"
            >
              <Minus size={15} /> Eliminar factor
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccessStep({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
  return (
    <div className="space-y-4">
      <ToggleCard
        active={form.clientPortalEnabled}
        icon={UsersRound}
        title="Habilitar portal del cliente"
        text="Deja preparada la empresa para asignar usuarios cliente; no envía invitaciones automáticamente."
        onChange={(value) => update("clientPortalEnabled", value)}
      />
      <ToggleCard
        active={form.restrictedTaxAccessEnabled}
        icon={LockKeyhole}
        title="Gestionar accesos tributarios restringidos"
        text="Habilita el futuro módulo cifrado y auditado de credenciales, sin guardar claves en esta ficha."
        onChange={(value) => update("restrictedTaxAccessEnabled", value)}
      />
    </div>
  );
}

function OfferingGrid({
  items,
  onToggle,
  selected,
  title,
}: {
  items: CompanyOfferingOption[];
  onToggle: (id: string) => void;
  selected: string[];
  title: string;
}) {
  return (
    <section>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-stone-500">
        Solo aparecen opciones habilitadas por la firma; la empresa hereda sus
        reglas, fuente y vigencia.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.length ? (
          items.map((item) => (
            <button
              aria-pressed={selected.includes(item.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left ${selected.includes(item.id) ? "border-emerald-300 bg-emerald-50/70" : "border-stone-200"}`}
              key={item.id}
              onClick={() => onToggle(item.id)}
              type="button"
            >
              <span
                className={`mt-0.5 grid size-5 place-items-center rounded border ${selected.includes(item.id) ? "bg-[#14352d] text-white" : "border-stone-300"}`}
              >
                {selected.includes(item.id) && <Check size={13} />}
              </span>
              <span>
                <b className="block text-sm">{item.name}</b>
                <span className="text-xs text-stone-500">
                  {item.organism} · {item.cadence}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-stone-500 sm:col-span-2">
            No hay opciones habilitadas en la configuración de la firma.
          </p>
        )}
      </div>
    </section>
  );
}
function ToggleCard({
  active,
  icon: Icon,
  onChange,
  text,
  title,
}: {
  active: boolean;
  icon: typeof UsersRound;
  onChange: (value: boolean) => void;
  text: string;
  title: string;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-xl border p-4 ${active ? "border-emerald-400 bg-emerald-50" : "border-stone-200"}`}
    >
      <div className="flex items-start gap-3">
        <input
          checked={active}
          className="mt-1 size-4 accent-[#14352d]"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <Icon className="text-[#14352d]" size={20} />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-stone-600">{text}</p>
        </div>
      </div>
    </label>
  );
}
function TextField({
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required && <span className="text-rose-600"> *</span>}
      <Input
        className="field mt-1.5"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <DatePicker className="mt-1.5" onValueChange={onChange} value={value} />
    </label>
  );
}
function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <SimpleSelect
        className="field mt-1.5"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Selecciona una opción</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </SimpleSelect>
    </label>
  );
}
