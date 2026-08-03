import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { getPaymentCommitments } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    return NextResponse.json(
      await getPaymentCommitments(await resolveAuthContext(request.headers)),
    );
  } catch (error) {
    return calendarError(error);
  }
}
