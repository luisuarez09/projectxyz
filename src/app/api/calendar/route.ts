import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { getCalendarPeriod } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    const companyId = url.searchParams.get("companyId") ?? "all";
    const view = url.searchParams.get("view") ?? "due";
    return NextResponse.json(
      await getCalendarPeriod(
        await resolveAuthContext(request.headers),
        period,
        companyId,
        view,
      ),
    );
  } catch (error) {
    return calendarError(error);
  }
}
