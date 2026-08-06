"use client";

import { AlertTriangle, Banknote, CalendarDays, Check, FileCheck2, Landmark, Plus, Save, Utensils, WalletCards, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback, type ComponentType, type ReactNode } from "react";

import { AttachmentInput } from "@/components/ui/attachment-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useCompanyContext } from "@/components/company-context";
import {
  type LaborSettingsFormData,
  type LaborSettingsDetail,
  type LaborDeductionRow,
  type LaborPayrollFrequency,
  type LaborRateSource,
  type LaborRateLockMoment,
  type LaborBenefitScheme,
  type LaborVacationSchedule,
  type LaborCalculationBasis,
  type LaborFoodBonusCadence,
  laborPayrollFrequencyLabel,
  laborRateSourceLabel,
  laborRateLockMomentLabel,
  laborCalculationBasisLabel,
  emptyLaborSettings
} from "@/modules/firm/employees/domain/labor-settings";

const authorizedPeople = [
  { id: "rrhh", name: "María Fernanda Rojas", role: "Gerente de Recursos Humanos" },
  { id: "gerencia", name: "Carlos Enrique Medina", role: "Gerente general" },
  { id: "administracion", name: "Daniela Suárez", role: "Gerente de Administración" },
];

export function CompanyLaborSettings() {
  const { activeCompany } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [settings, setSettings] = useState<LaborSettingsDetail | null>(null);
  const [draft, setDraft] = useState<LaborSettingsFormData>(emptyLaborSettings);

  const [signature, setSignature] = useState("");
  const [authorizedSignerId, setAuthorizedSignerId] = useState("rrhh");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/companies/labor-settings`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new Error("No tienes acceso a esta configuración.");
        throw new Error("No fue posible cargar la configuración laboral.");
      }
      const data = await res.json();
      setSettings(data);
      setDraft(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id]);

  useEffect(() => {
    if (activeCompany) void loadSettings();
  }, [loadSettings, activeCompany]);

  const updateDraft = (key: keyof LaborSettingsFormData, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateDeduction = (index: number, key: keyof LaborDeductionRow, value: any) => {
    setDraft((prev) => {
      const newDeductions = [...prev.deductions];
      newDeductions[index] = { ...newDeductions[index], [key]: value };
      return { ...prev, deductions: newDeductions };
    });
  };

  const addDeduction = () => {
    setDraft((prev) => ({
      ...prev,
      deductions: [
        ...prev.deductions,
        {
          name: "Nueva deducción",
          ratePercent: "",
          basis: "PENDING",
          cap: "",
          capCurrency: "VES",
          effectiveFrom: "",
          source: "",
          active: true,
        },
      ],
    }));
  };

  const removeDeduction = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index),
    }));
  };

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const payload = { ...draft, version: settings?.version };
      const res = await fetch(`/api/companies/labor-settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No fue posible guardar la configuración.");
      setSettings(data);
      setDraft(data);
      setNotice("Cambios guardados correctamente.");
      setTimeout(() => setNotice(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const authorizedSigner = authorizedPeople.find((person) => person.id === authorizedSignerId) ?? authorizedPeople[0];

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </main>
    );
  }

  if (error && !settings) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="mt-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-300">
          {error}
        </p>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 py-7 pb-16">
      <header className="flex min-w-0 flex-col gap-4 border-b border-stone-200 pb-6 dark:border-stone-800 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-stone-500">{activeCompany?.legalName ?? "Empresa activa"} / Configuración / Laboral</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Configuración laboral</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
            Frecuencia de nómina, conversión a bolívares, beneficios y deducciones propias de la empresa.
          </p>
        </div>
        <Button className="h-9 bg-[#14352d] hover:bg-[#0e2821]" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save />}
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </header>

      {error && !notice && (
        <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-200">
          <Check size={16} /> {notice}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden h-fit max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 xl:sticky xl:top-20 xl:block xl:self-start">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Configuración laboral</p>
          {[
            ["nomina", "Nómina y moneda"],
            ["salario-minimo", "Salario mínimo"],
            ["beneficios", "Beneficios"],
            ["alimentacion", "Alimentación"],
            ["deducciones", "Deducciones"],
            ["documentos", "Firma autorizada"],
          ].map(([id, label]) => (
            <a
              className="block rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-[#14352d] dark:text-stone-300 dark:hover:bg-stone-800"
              href={`#${id}`}
              key={id}
            >
              {label}
            </a>
          ))}
        </aside>

        <main className="min-w-0 space-y-6">
          <SettingCard
            icon={WalletCards}
            id="nomina"
            title="Nómina y moneda de referencia"
            text="La empresa define cómo acuerda salarios; todos los recibos se emiten en bolívares."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Frecuencia de nómina">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("payrollFrequency", e.target.value)}
                  value={draft.payrollFrequency}
                >
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="MONTHLY">Mensual</option>
                </SimpleSelect>
              </Field>
              <Field label="Divisa del salario acordado">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("salaryCurrency", e.target.value)}
                  value={draft.salaryCurrency}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="VES">VES</option>
                </SimpleSelect>
              </Field>
              <Field label="Fuente de conversión">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("rateSource", e.target.value)}
                  value={draft.rateSource}
                >
                  <option value="BCV">Tasa oficial BCV</option>
                  <option value="COMPANY">Tasa propia de la empresa</option>
                </SimpleSelect>
              </Field>
              <Field label="Momento de fijación">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("rateLockMoment", e.target.value)}
                  value={draft.rateLockMoment}
                >
                  <option value="PAYROLL_CREATION">Al crear la nómina</option>
                  <option value="PAYMENT_DATE">En la fecha de pago</option>
                  <option value="FIRST_PERIOD">Primera quincena del período</option>
                </SimpleSelect>
              </Field>
            </div>
            {draft.rateSource === "COMPANY" && (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100">
                <b>Tasa manual obligatoria.</b>
                <p className="mt-1 leading-5">
                  Cada nómina solicitará tasa, fecha y nota de autorización para conservar trazabilidad.
                </p>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Configuración actual: {laborPayrollFrequencyLabel[draft.payrollFrequency as LaborPayrollFrequency]?.toLowerCase() ?? "—"}, salario acordado en {draft.salaryCurrency} y conversión mediante {draft.rateSource === "COMPANY" ? "tasa propia" : "tasa oficial BCV"}.
            </p>
          </SettingCard>

          <SettingCard
            icon={Landmark}
            id="salario-minimo"
            title="Salario mínimo de referencia"
            text="Información general del sistema; no crea un segundo salario por trabajador."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Monto vigente · Bs">
                <Input
                  className="field mt-1.5"
                  inputMode="decimal"
                  onChange={(e) => updateDraft("minWageAmount", e.target.value)}
                  placeholder="Ingrese el monto validado"
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.minWageAmount}
                />
              </Field>
              <Field label="Vigente desde">
                <Input
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("minWageEffectiveFrom", e.target.value)}
                  type="date"
                  value={draft.minWageEffectiveFrom}
                />
              </Field>
              <Field wide label="Fuente oficial">
                <Input
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("minWageSource", e.target.value)}
                  placeholder="Gaceta, decreto o enlace validado"
                  value={draft.minWageSource}
                />
              </Field>
            </div>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
              <AlertTriangle className="mr-1 inline" size={14} /> No se precarga un monto como vigente sin fuente y fecha de aplicación.
            </p>
          </SettingCard>

          <SettingCard
            icon={CalendarDays}
            id="beneficios"
            title="Vacaciones y utilidades"
            text="La regla base puede conservarse o sustituirse por beneficios superiores definidos por la empresa."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Esquema de beneficios">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("benefitScheme", e.target.value)}
                  value={draft.benefitScheme}
                >
                  <option value="LEGAL">Según regla legal (LOTTT)</option>
                  <option value="CUSTOM">Beneficios personalizados (superiores)</option>
                </SimpleSelect>
              </Field>
              <Field label="Programación del disfrute">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("vacationSchedule", e.target.value)}
                  value={draft.vacationSchedule}
                >
                  <option value="ANNIVERSARY">Al cumplir el aniversario</option>
                  <option value="YEAR_END">Política colectiva de fin de año</option>
                </SimpleSelect>
              </Field>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <BenefitRule
                base={draft.vacationDaysBase}
                cap={draft.vacationDaysCap}
                editable={draft.benefitScheme === "CUSTOM"}
                increment={draft.vacationDaysIncrement}
                onChangeBase={(v) => updateDraft("vacationDaysBase", v)}
                onChangeCap={(v) => updateDraft("vacationDaysCap", v)}
                onChangeIncrement={(v) => updateDraft("vacationDaysIncrement", v)}
                title="Vacaciones"
              />
              <BenefitRule
                base={draft.bonusDaysBase}
                cap={draft.bonusDaysCap}
                editable={draft.benefitScheme === "CUSTOM"}
                increment={draft.bonusDaysIncrement}
                onChangeBase={(v) => updateDraft("bonusDaysBase", v)}
                onChangeCap={(v) => updateDraft("bonusDaysCap", v)}
                onChangeIncrement={(v) => updateDraft("bonusDaysIncrement", v)}
                title="Bono vacacional"
              />
              <BenefitRule
                base={draft.profitDaysBase}
                cap={draft.profitDaysCap}
                editable={draft.benefitScheme === "CUSTOM"}
                increment={draft.profitDaysIncrement}
                onChangeBase={(v) => updateDraft("profitDaysBase", v)}
                onChangeCap={(v) => updateDraft("profitDaysCap", v)}
                onChangeIncrement={(v) => updateDraft("profitDaysIncrement", v)}
                title="Utilidades"
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Base · vacaciones">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("vacationBasis", e.target.value)}
                  value={draft.vacationBasis}
                >
                  <option value="PENDING">Pendiente de definir</option>
                  <option value="AGREED_SALARY">Salario acordado vigente</option>
                  <option value="MIN_WAGE">Salario mínimo</option>
                  <option value="AVERAGE_SALARY">Promedio del período</option>
                </SimpleSelect>
              </Field>
              <Field label="Base · bono vacacional">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("bonusBasis", e.target.value)}
                  value={draft.bonusBasis}
                >
                  <option value="PENDING">Pendiente de definir</option>
                  <option value="AGREED_SALARY">Salario acordado vigente</option>
                  <option value="MIN_WAGE">Salario mínimo</option>
                  <option value="AVERAGE_SALARY">Promedio del período</option>
                </SimpleSelect>
              </Field>
              <Field label="Base · utilidades">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("profitBasis", e.target.value)}
                  value={draft.profitBasis}
                >
                  <option value="PENDING">Pendiente de definir</option>
                  <option value="AGREED_SALARY">Salario acordado vigente</option>
                  <option value="AVERAGE_SALARY">Promedio del período</option>
                </SimpleSelect>
              </Field>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Cada concepto conserva su propia base. Las opciones marcadas “Pendiente de definir” no producirán un cálculo definitivo.
            </p>
          </SettingCard>

          <SettingCard
            icon={Utensils}
            id="alimentacion"
            title="Bono de alimentación"
            text="Monto mensual de referencia que puede mejorarse individualmente por trabajador."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Monto mínimo mensual">
                <Input
                  className="field mt-1.5"
                  inputMode="decimal"
                  onChange={(e) => updateDraft("foodBonusAmount", e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft.foodBonusAmount}
                />
              </Field>
              <Field label="Moneda">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("foodBonusCurrency", e.target.value)}
                  value={draft.foodBonusCurrency}
                >
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
                </SimpleSelect>
              </Field>
              <Field label="Entrega en nómina">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("foodBonusCadence", e.target.value)}
                  value={draft.foodBonusCadence}
                >
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="MONTHLY">Mensual</option>
                </SimpleSelect>
              </Field>
              <Field wide label="Fuente y vigencia">
                <Input
                  className="field mt-1.5"
                  onChange={(e) => updateDraft("foodBonusSource", e.target.value)}
                  placeholder="Documento validado y fecha de aplicación"
                  value={draft.foodBonusSource}
                />
              </Field>
            </div>
            <div className="mt-4 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              <b>Aplicación:</b> el monto es total mensual. Si la nómina es quincenal, se divide entre ambas quincenas. Las inasistencias no lo disminuyen y cada ficha puede guardar un monto superior.
            </div>
          </SettingCard>

          <SettingCard
            icon={Banknote}
            id="deducciones"
            title="Deducciones y aportes"
            text="Cada parámetro requiere porcentaje, base, vigencia y fuente antes de activarse."
          >
            <div className="space-y-4">
              {draft.deductions.map((item, index) => (
                <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-700" key={item.id ?? index}>
                  <div className="flex items-center justify-between">
                    <Input
                      className="h-8 max-w-[200px] border-transparent bg-transparent px-0 text-base font-semibold focus-visible:border-emerald-500 focus-visible:px-2 focus-visible:ring-emerald-500/20"
                      onChange={(e) => updateDeduction(index, "name", e.target.value)}
                      placeholder="Nombre del concepto"
                      value={item.name}
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}
                      >
                        {item.active ? "Activa" : "Inactiva"}
                      </span>
                      <Button
                        aria-label="Eliminar deducción"
                        className="text-stone-400 hover:text-rose-600"
                        onClick={() => removeDeduction(index)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Porcentaje">
                      <Input
                        className="field mt-1.5"
                        inputMode="decimal"
                        onChange={(e) => updateDeduction(index, "ratePercent", e.target.value)}
                        placeholder="Definir"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={item.ratePercent}
                      />
                    </Field>
                    <Field label="Base de cálculo">
                      <SimpleSelect
                        className="field mt-1.5"
                        onChange={(e) => updateDeduction(index, "basis", e.target.value)}
                        value={item.basis}
                      >
                        <option value="PENDING">Pendiente de definir</option>
                        <option value="MIN_WAGE">Salario mínimo</option>
                        <option value="AGREED_SALARY">Salario acordado convertido</option>
                        <option value="CUSTOM">Base personalizada</option>
                      </SimpleSelect>
                    </Field>
                    <Field label="Tope (Opcional)">
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          className="field"
                          inputMode="decimal"
                          onChange={(e) => updateDeduction(index, "cap", e.target.value)}
                          placeholder="Si aplica"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.cap}
                        />
                        <SimpleSelect
                          className="field w-24 flex-shrink-0"
                          onChange={(e) => updateDeduction(index, "capCurrency", e.target.value)}
                          value={item.capCurrency}
                        >
                          <option value="VES">VES</option>
                          <option value="USD">USD</option>
                        </SimpleSelect>
                      </div>
                    </Field>
                    <Field label="Vigente desde">
                      <Input
                        className="field mt-1.5"
                        onChange={(e) => updateDeduction(index, "effectiveFrom", e.target.value)}
                        type="date"
                        value={item.effectiveFrom}
                      />
                    </Field>
                    <Field wide label="Fuente">
                      <Input
                        className="field mt-1.5"
                        onChange={(e) => updateDeduction(index, "source", e.target.value)}
                        placeholder="Norma o documento validado"
                        value={item.source}
                      />
                    </Field>
                  </div>
                </section>
              ))}
              {draft.deductions.length === 0 && (
                <p className="rounded-lg border border-dashed border-stone-300 p-5 text-center text-sm text-stone-500 dark:border-stone-700">
                  No hay deducciones configuradas.
                </p>
              )}
            </div>
            <Button className="mt-4" onClick={addDeduction} variant="outline">
              <Plus /> Agregar deducción
            </Button>
          </SettingCard>

          <SettingCard
            icon={FileCheck2}
            id="documentos"
            title="Firma autorizada"
            text="Selecciona quién firma los recibos de nómina y beneficios en representación de la empresa."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Personal autorizado">
                <SimpleSelect
                  className="field mt-1.5"
                  onChange={(e) => setAuthorizedSignerId(e.target.value)}
                  value={authorizedSignerId}
                >
                  {authorizedPeople.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </SimpleSelect>
              </Field>
              <div className="rounded-lg bg-stone-50 p-4 dark:bg-stone-800">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Datos que saldrán en el recibo</p>
                <p className="mt-2 font-semibold">{authorizedSigner.name}</p>
                <p className="mt-1 text-sm text-stone-500">{authorizedSigner.role}</p>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-stone-300 p-4 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
              <FileCheck2 className="text-[#14352d] dark:text-emerald-300" size={20} />
              <span className="min-w-0 flex-1">
                <b className="block text-sm">Firma de {authorizedSigner.name}</b>
                <span className="mt-1 block truncate text-xs text-stone-500">
                  {signature || "Seleccionar imagen PNG o JPG"}
                </span>
              </span>
              <AttachmentInput
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => setSignature(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              El logo y el sello se administran desde Información general de la empresa. La firma debe conservarse cifrada, con
              acceso por empresa y registro de auditoría.
            </p>
          </SettingCard>
        </main>
      </div>
    </div>
  );
}

function BenefitRule({
  title,
  base,
  increment,
  cap,
  editable,
  onChangeBase,
  onChangeIncrement,
  onChangeCap,
}: {
  title: string;
  base: string;
  increment: string;
  cap: string;
  editable: boolean;
  onChangeBase: (val: string) => void;
  onChangeIncrement: (val: string) => void;
  onChangeCap: (val: string) => void;
}) {
  return (
    <section className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniField disabled={!editable} label="Base" onChange={onChangeBase} value={base} />
        <MiniField disabled={!editable} label="+ por año" onChange={onChangeIncrement} value={increment} />
        <MiniField disabled={!editable} label="Tope" onChange={onChangeCap} value={cap} />
      </div>
      <p className="mt-3 text-xs text-stone-500">Valores en días · {editable ? "personalizable" : "regla base"}</p>
    </section>
  );
}

function MiniField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
}) {
  return (
    <label className="text-[11px] font-medium text-stone-500">
      {label}
      <Input
        className="field mt-1 h-8 px-2"
        disabled={disabled}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        type="number"
        min="0"
        value={value}
      />
    </label>
  );
}

function SettingCard({
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
    <section className="scroll-mt-24 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900" id={id}>
      <header className="flex gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f0e9] text-[#14352d] dark:bg-emerald-950 dark:text-emerald-200">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-stone-500">{text}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ children, label, wide = false }: { children: ReactNode; label: string; wide?: boolean }) {
  return <label className={`text-sm font-medium ${wide ? "md:col-span-2 xl:col-span-3" : ""}`}>{label}{children}</label>;
}
