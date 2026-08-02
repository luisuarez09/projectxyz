import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { reconcileCalendar } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    return NextResponse.json(
      await reconcileCalendar(
        await resolveAuthContext(request.headers),
        await request.json(),
      ),
    );
  } catch (error) {
    return calendarError(error);
  }
}
