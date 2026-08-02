"use client";

import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { type DeadlineBase, type DeadlineMode, type DeadlineRule, type DayType, formatDeadlineRule } from "@/lib/deadline-rules";

export function DeadlineRuleFields({
  value,
  onChange,
  allowDocumentDate = false,
  allowOfficialCalendar = false,
}: {
  value: DeadlineRule;
  onChange: (rule: DeadlineRule) => void;
  allowDocumentDate?: boolean;
  allowOfficialCalendar?: boolean;
}) {
  return (
    <div className="sm:col-span-2 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <p className="text-sm font-semibold">Cálculo de la fecha tope</p>
      <p className="mt-1 text-xs leading-5 text-stone-500">Estos campos alimentarán las actividades, alertas y el calendario. “Hábiles” excluye fines de semana y, al conectar el backend, también los feriados registrados.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="field-label sm:col-span-3">Cómo se determina<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...value, mode: event.target.value as DeadlineMode })} value={value.mode}><option value="days">Plazo contado por días</option>{allowOfficialCalendar && <option value="official-calendar">Calendario anual SPE</option>}{allowDocumentDate && <option value="document-date">Fecha indicada en factura o documento</option>}</SimpleSelect></label>
        {value.mode === "days" && <>
          <label className="field-label">Cantidad de días<Input className="field mt-1.5" min="1" onChange={(event) => onChange({ ...value, dayCount: Number(event.target.value) })} type="number" value={value.dayCount || ""} /></label>
          <label className="field-label">Tipo de días<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...value, dayType: event.target.value as DayType })} value={value.dayType}><option value="business">Días hábiles</option><option value="calendar">Días continuos</option></SimpleSelect></label>
          <label className="field-label">Contar desde<SimpleSelect className="field mt-1.5" onChange={(event) => onChange({ ...value, base: event.target.value as DeadlineBase })} value={value.base}><option value="period-start">Inicio del período</option><option value="period-end">Cierre del período</option><option value="document-date">Fecha del documento</option></SimpleSelect></label>
        </>}
      </div>
      <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">Resultado: {formatDeadlineRule(value)}</p>
    </div>
  );
}
