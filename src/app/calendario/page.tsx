import { FiscalCalendar } from "@/components/fiscal-calendar";
import type { CalendarViewMode } from "@/modules/calendar/domain/calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>;
}) {
  const { period, view } = await searchParams;
  const initialView: CalendarViewMode = view === "period" ? "period" : "due";
  return <FiscalCalendar initialPeriod={period} initialView={initialView} />;
}
