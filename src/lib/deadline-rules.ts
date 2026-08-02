export type DeadlineMode = "days" | "official-calendar" | "document-date";
export type DayType = "business" | "calendar";
export type DeadlineBase = "period-start" | "period-end" | "document-date";

export type DeadlineRule = {
  mode: DeadlineMode;
  dayCount: number;
  dayType: DayType;
  base: DeadlineBase;
};

export const emptyDeadlineRule: DeadlineRule = {
  mode: "days",
  dayCount: 0,
  dayType: "business",
  base: "period-start",
};

export function isDeadlineConfigured(rule: DeadlineRule) {
  return rule.mode !== "days" || rule.dayCount > 0;
}

export function formatDeadlineRule(rule: DeadlineRule) {
  if (rule.mode === "official-calendar") return "Según calendario anual SPE";
  if (rule.mode === "document-date") return "Fecha indicada en factura o documento";
  if (!rule.dayCount) return "Por configurar";

  const days = rule.dayType === "business" ? "hábiles" : "continuos";
  if (rule.base === "period-start") return `Primeros ${rule.dayCount} días ${days} desde el inicio del período`;
  if (rule.base === "period-end") return `${rule.dayCount} días ${days} después del cierre del período`;
  return `${rule.dayCount} días ${days} desde la fecha del documento`;
}

export function addDeadlineDays(
  base: Date,
  count: number,
  type: DayType,
  includeBase = false,
) {
  const cursor = new Date(base);
  if (!includeBase) cursor.setUTCDate(cursor.getUTCDate() + 1);
  let remaining = count;
  while (remaining > 0) {
    const weekday = cursor.getUTCDay();
    if (type === "calendar" || (weekday !== 0 && weekday !== 6)) remaining -= 1;
    if (remaining > 0) cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cursor;
}
