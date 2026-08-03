import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { listDeclarations } from "@/modules/declarations/application/declarations";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await listDeclarations(await resolveAuthContext(request.headers)));
  } catch (error) {
    return calendarError(error);
  }
}
