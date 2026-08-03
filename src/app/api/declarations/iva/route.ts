import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { getIvaDeclarationWorkspace, updateIvaDeclaration } from "@/modules/declarations/application/declarations";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    return NextResponse.json(await getIvaDeclarationWorkspace(await resolveAuthContext(request.headers), period));
  } catch (error) {
    return calendarError(error);
  }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await updateIvaDeclaration(await resolveAuthContext(request.headers), await request.json()));
  } catch (error) {
    return calendarError(error);
  }
}
