import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { saveFiscalCalendarMatrix, updateFiscalCalendarMatrix } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request, { params }: { params: Promise<{ calendarId: string; matrixId: string }> }) {
  try {
    const { calendarId, matrixId } = await params;
    return NextResponse.json({ calendar: await saveFiscalCalendarMatrix(await resolveAuthContext(request.headers), calendarId, matrixId, await request.json()) });
  } catch (error) { return firmCatalogError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ calendarId: string; matrixId: string }> }) {
  try {
    const { calendarId, matrixId } = await params;
    return NextResponse.json({ calendar: await updateFiscalCalendarMatrix(await resolveAuthContext(request.headers), calendarId, matrixId, await request.json()) });
  } catch (error) { return firmCatalogError(error); }
}
