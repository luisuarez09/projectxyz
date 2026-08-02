"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  FileText,
  Landmark,
  Minus,
  Plus,
  Save,
  Settings2,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { useCompanyContext } from "@/components/company-context";
import { CalendarReconciliationPanel } from "@/components/calendar-reconciliation-panel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import type {
  CompanyFormData,
  CompanyOfferingOption,
} from "@/modules/companies/domain/company";
import { offeringAppliesToCompany } from "@/modules/companies/domain/company";

type Update = <K extends keyof CompanyFormData>(
  key: K,
  value: CompanyFormData[K],
) => void;

export function CompanyEditor() {
  const router = useRouter();
  const { activeCompany, canManage, canReconcile, loading, offerings, refresh, staff } =
    useCompanyContext();
  const [form, setForm] = useState<CompanyFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    setForm(
      activeCompany
        ? {
            ...activeCompany,
            branches: activeCompany.branches.map((item) => ({ ...item })),
            officers: activeCompany.officers.map((item) => ({ ...item })),
            municipalActivities: activeCompany.municipalActivities.map(
              (item) => ({ ...item }),
            ),
          }
        : null,
    );
    setSaved(false);
    setDirty(false);
    setError(null);
  }, [activeCompany]);
  useEffect(() => {
    setForm((current) => {
      if (!current) return current;
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
  }, [offerings, form?.taxpayerType]);

  if (loading)
    return (
      <div className="py-16 text-center text-sm text-stone-500">
        Cargando empresa activa…
      </div>
    );
  if (!activeCompany || !form)
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <Building2 className="mx-auto text-stone-400" size={34} />
        <h1 className="mt-4 text-2xl font-semibold">
          No hay una empresa activa
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Selecciona una empresa en el header o desde el directorio. Mientras no
          exista una empresa activa, su menú lateral permanece oculto.
        </p>
        <Link
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-[#14352d] px-4 text-sm font-medium text-white"
          href="/empresas"
        >
          Ir a Empresas
        </Link>
      </div>
    );
  const companyId = activeCompany.id;
  const companyVersion = activeCompany.version;
  const firmTaxOfferings = offerings.filter(
    (offering) =>
      offering.kind === "TAX" &&
      offeringAppliesToCompany(offering, form.taxpayerType),
  );
  const firmServiceOfferings = offerings.filter(
    ({ kind }) => kind === "SERVICE",
  );

  const update: Update = (key, value) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
    setDirty(true);
  };

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          version: companyVersion,
          taxOfferingKeys: form.taxOfferingKeys.filter((key) =>
            firmTaxOfferings.some(({ id }) => id === key),
          ),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible guardar la empresa.");
      setForm(body.company);
      setSaved(true);
      setDirty(false);
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: companyVersion,
          confirmation: deleteText,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible retirar la empresa.");
      setDeleteOpen(false);
      await refresh();
      router.push("/empresas");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible retirar la empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCount =
    form.taxOfferingKeys.length + form.serviceOfferingKeys.length;
  const sections = [
    ["general", "Información general"],
    ["cobertura", "Cobertura"],
    ...(form.taxOfferingKeys.includes("municipal")
      ? [["municipal", "Impuesto municipal"]]
      : []),
    ["sucursales", "Sucursales"],
    ["legal", "Información legal"],
    ...(form.taxOfferingKeys.includes("inces") ? [["inces", "INCES"]] : []),
    ["accesos", "Portal y accesos"],
    ["documentos", "Logo, sello y documentos"],
    ["eliminar", "Eliminar empresa"],
  ];

  return (
    <div className="mx-auto w-full min-w-0 py-7 pb-16">
      <header className="flex min-w-0 flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-stone-500">
            Empresa activa / Configuración
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
              {activeCompany.legalName}
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Activa
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            La misma ficha persistida que se completa durante el registro
            inicial.
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-[#14352d]"
            disabled={saving}
            onClick={() => void save()}
          >
            <Save size={16} /> {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </header>
      {error && (
        <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}
      {saved && (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <Check size={16} /> Cambios guardados y sincronizados.
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Summary
          label="Plan asignado"
          value={form.servicePlan || "Sin asignar"}
          detail="Cobertura personalizable"
        />
        <Summary
          label="Cobertura activa"
          value={`${selectedCount} elementos`}
          detail={`${form.taxOfferingKeys.length} obligaciones · ${form.serviceOfferingKeys.length} servicios`}
        />
        <Summary
          label="Régimen"
          value={form.taxpayerType || "Por definir"}
          detail="Dato fiscal de la empresa"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden h-fit max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:sticky xl:top-20 xl:block">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Ficha de empresa
          </p>
          {sections.map(([id, label]) => (
            <a
              className="block rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-[#14352d]"
              href={`#${id}`}
              key={id}
            >
              {label}
            </a>
          ))}
        </aside>
        <main className="min-w-0 space-y-6">
          <Section
            id="general"
            icon={Building2}
            title="Información general"
            text="Identificación fiscal, contacto, responsable y registros patronales."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Razón social"
                value={form.legalName}
                onChange={(value) => update("legalName", value)}
              />
              <TextField
                label="Nombre comercial"
                value={form.tradeName}
                onChange={(value) => update("tradeName", value)}
              />
              <TextField
                label="RIF"
                value={form.rif}
                onChange={(value) => update("rif", value)}
              />
              <TextField
                label="Actividad económica"
                value={form.activity}
                onChange={(value) => update("activity", value)}
              />
              <div className="md:col-span-2">
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
              <label className="text-sm font-medium">
                Contador responsable
                <SimpleSelect
                  className="field mt-1.5"
                  value={form.responsibleProfileId}
                  onChange={(event) =>
                    update("responsibleProfileId", event.target.value)
                  }
                >
                  <option value="">Sin asignar</option>
                  {staff.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </SimpleSelect>
              </label>
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
          </Section>

          <Section
            id="cobertura"
            icon={Settings2}
            title="Declaraciones y servicios"
            text="La empresa selecciona cobertura; reglas, fuente y vigencia pertenecen a la firma."
          >
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
              onToggle={(id) =>
                update("taxOfferingKeys", toggle(form.taxOfferingKeys, id))
              }
            />
            <OfferingGrid
              items={firmServiceOfferings}
              selected={form.serviceOfferingKeys}
              title="Servicios"
              onToggle={(id) =>
                update(
                  "serviceOfferingKeys",
                  toggle(form.serviceOfferingKeys, id),
                )
              }
            />
            {canReconcile && (
              <CalendarReconciliationPanel
                companyId={companyId}
                companyName={activeCompany.legalName}
                disabled={dirty || saving}
              />
            )}
          </Section>

          {form.taxOfferingKeys.includes("municipal") && (
            <Section
              id="municipal"
              icon={Landmark}
              title="Impuesto municipal"
              text="Factores particulares con jurisdicción, vigencia y fuente."
            >
              <MunicipalActivities form={form} update={update} />
            </Section>
          )}

          <Section
            id="sucursales"
            icon={Building2}
            title="Sucursales y jurisdicciones"
            text="Cada sede conserva nombre, código y domicilio."
          >
            <BranchEditor form={form} update={update} />
          </Section>

          <Section
            id="legal"
            icon={FileText}
            title="Información legal y junta directiva"
            text="Datos registrales, capital y cargos con fechas de vigencia."
          >
            <div className="grid gap-4 md:grid-cols-2">
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
            <OfficerEditor form={form} update={update} />
          </Section>

          {form.taxOfferingKeys.includes("inces") && (
            <Section
              id="inces"
              icon={Landmark}
              title="INCES · configuración particular"
              text="Identificación de registro y representante legal."
            >
              <div className="grid gap-4 md:grid-cols-2">
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
                  onChange={(value) =>
                    update("legalRepresentativeDocument", value)
                  }
                />
                <TextField
                  label="Teléfono"
                  value={form.legalRepresentativePhone}
                  onChange={(value) =>
                    update("legalRepresentativePhone", value)
                  }
                />
                <TextField
                  label="Correo"
                  type="email"
                  value={form.legalRepresentativeEmail}
                  onChange={(value) =>
                    update("legalRepresentativeEmail", value)
                  }
                />
              </div>
            </Section>
          )}

          <Section
            id="accesos"
            icon={UsersRound}
            title="Portal y accesos restringidos"
            text="Habilitaciones propias de esta empresa."
          >
            <Toggle
              checked={form.clientPortalEnabled}
              label="Portal del cliente habilitado"
              onChange={(value) => update("clientPortalEnabled", value)}
            />
            <Toggle
              checked={form.restrictedTaxAccessEnabled}
              label="Gestión de accesos tributarios restringidos"
              onChange={(value) => update("restrictedTaxAccessEnabled", value)}
            />
          </Section>

          <Section
            id="documentos"
            icon={FileText}
            title="Logo, sello y documentos"
            text="Los archivos se gestionan fuera del registro relacional de la empresa."
          >
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
              La base documental y el almacenamiento privado ya están separados
              de PostgreSQL. La carga de logo, sello, actas y firmas se
              conectará al expediente documental con permisos y auditoría; esta
              entrega no almacena nombres de archivos como si fueran documentos
              reales.
            </div>
          </Section>

          {canManage && (
            <Section
              id="eliminar"
              icon={Trash2}
              title="Eliminar empresa"
              text="Retira la empresa de operación sin borrar su trazabilidad."
            >
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
                <AlertTriangle className="mr-2 inline" size={16} />
                Se archivará la empresa y se desactivará como contexto para
                todos los usuarios. Escribe <b>ELIMINAR</b> en la confirmación.
              </div>
              <Button
                className="mt-4 text-rose-800"
                onClick={() => setDeleteOpen(true)}
                variant="outline"
              >
                Retirar empresa
              </Button>
            </Section>
          )}
        </main>
      </div>
      {deleteOpen && (
        <Modal>
          <h2 className="text-lg font-semibold text-rose-800">
            Retirar {activeCompany.legalName}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Los datos se conservan para auditoría, pero la empresa dejará de
            aparecer en el portafolio operativo.
          </p>
          <TextField
            label="Escribe ELIMINAR para confirmar"
            value={deleteText}
            onChange={setDeleteText}
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                setDeleteOpen(false);
                setDeleteText("");
              }}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="bg-rose-700 text-white"
              disabled={deleteText !== "ELIMINAR" || saving}
              onClick={() => void archive()}
            >
              {saving ? "Retirando…" : "Retirar empresa"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BranchEditor({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
  const change = (
    index: number,
    key: "name" | "code" | "address",
    value: string,
  ) =>
    update(
      "branches",
      form.branches.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  return (
    <div className="space-y-3">
      {form.branches.map((branch, index) => (
        <div
          className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_.6fr_2fr_auto]"
          key={index}
        >
          <TextField
            label="Nombre"
            value={branch.name}
            onChange={(value) => change(index, "name", value)}
          />
          <TextField
            label="Código"
            value={branch.code}
            onChange={(value) => change(index, "code", value)}
          />
          <TextField
            label="Dirección"
            value={branch.address}
            onChange={(value) => change(index, "address", value)}
          />
          <Button
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
      <Button
        onClick={() =>
          update("branches", [
            ...form.branches,
            { name: "", code: "", address: "" },
          ])
        }
        variant="outline"
      >
        <Plus size={15} /> Agregar sucursal
      </Button>
    </div>
  );
}
function OfficerEditor({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
  const change = (
    index: number,
    key: keyof CompanyFormData["officers"][number],
    value: string,
  ) =>
    update(
      "officers",
      form.officers.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Junta directiva</p>
        <Button
          onClick={() =>
            update("officers", [
              ...form.officers,
              { position: "", fullName: "", termStartsAt: "", termEndsAt: "" },
            ])
          }
          size="sm"
          variant="outline"
        >
          <Plus size={15} /> Agregar cargo
        </Button>
      </div>
      {form.officers.map((officer, index) => (
        <div
          className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_.8fr_.8fr_auto]"
          key={index}
        >
          <TextField
            label="Cargo"
            value={officer.position}
            onChange={(value) => change(index, "position", value)}
          />
          <TextField
            label="Nombre"
            value={officer.fullName}
            onChange={(value) => change(index, "fullName", value)}
          />
          <DateField
            label="Desde"
            value={officer.termStartsAt}
            onChange={(value) => change(index, "termStartsAt", value)}
          />
          <DateField
            label="Hasta"
            value={officer.termEndsAt}
            onChange={(value) => change(index, "termEndsAt", value)}
          />
          <Button
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
  );
}
function MunicipalActivities({
  form,
  update,
}: {
  form: CompanyFormData;
  update: Update;
}) {
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
    <div className="space-y-3">
      {form.municipalActivities.map((item, index) => (
        <div
          className="grid gap-3 rounded-lg border p-3 md:grid-cols-3"
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
      <Button
        onClick={() =>
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
          ])
        }
        variant="outline"
      >
        <Plus size={15} /> Agregar factor
      </Button>
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
    <section className="mt-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-stone-500">
        Solo aparecen opciones actualmente habilitadas por la firma.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.length ? (
          items.map((item) => (
            <button
              aria-pressed={selected.includes(item.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left ${selected.includes(item.id) ? "border-emerald-300 bg-emerald-50/70" : "border-stone-200"}`}
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
          <p className="rounded-lg border border-dashed p-3 text-sm text-stone-500 md:col-span-2">
            No hay opciones habilitadas en la configuración de la firma.
          </p>
        )}
      </div>
    </section>
  );
}
function toggle(values: string[], id: string) {
  return values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];
}
function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mt-3 flex items-center gap-3 rounded-lg border p-4 text-sm font-medium">
      <input
        checked={checked}
        className="size-4 accent-[#14352d]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input
        className="field mt-1.5"
        onChange={(event) => onChange(event.target.value)}
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
    <label className="block text-sm font-medium">
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
    <label className="block text-sm font-medium">
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
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}
function Section({
  children,
  icon: Icon,
  id,
  text,
  title,
}: {
  children: ReactNode;
  icon: ComponentType<{ size?: number }>;
  id: string;
  text: string;
  title: string;
}) {
  return (
    <section
      className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900"
      id={id}
    >
      <div className="flex gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d]">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-stone-500">{text}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Modal({ children }: { children: ReactNode }) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/40 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        {children}
      </section>
    </div>
  );
}
