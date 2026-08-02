import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { resetCalendarCase } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params;
    return NextResponse.json(
      await resetCalendarCase(
        await resolveAuthContext(request.headers),
        caseId,
        await request.json(),
      ),
    );
  } catch (error) {
    return calendarError(error);
  }
}
