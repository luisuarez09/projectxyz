export type DeadlineMode = "days" | "official-calendar" | "document-date";
export type DayType = "business" | "calendar";
export type DeadlineBase = "next-period-start" | "period-end" | "document-date";

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
  base: "next-period-start",
};

export function isDeadlineConfigured(rule: DeadlineRule) {
  return rule.mode !== "days" || rule.dayCount > 0;
}

export function formatDeadlineRule(rule: DeadlineRule) {
  if (rule.mode === "official-calendar") return "Según calendario anual SPE";
  if (rule.mode === "document-date") return "Fecha indicada en factura o documento";
  if (!rule.dayCount) return "Por configurar";

  const days = rule.dayType === "business" ? "hábiles" : "continuos";
  if (rule.base === "next-period-start") return `Primeros ${rule.dayCount} días ${days} del período siguiente`;
  if (rule.base === "period-end") return `${rule.dayCount} días ${days} después del cierre del período`;
  return `${rule.dayCount} días ${days} desde la fecha del documento`;
}

