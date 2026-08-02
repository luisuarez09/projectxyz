import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { getAnnualStatusOverview } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await getAnnualStatusOverview(
        await resolveAuthContext(request.headers),
        url.searchParams.get("year") ?? new Date().getFullYear(),
        url.searchParams.get("kind") ?? "TAX",
      ),
    );
  } catch (error) {
    return calendarError(error);
  }
}
