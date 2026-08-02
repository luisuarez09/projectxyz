import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { createFiscalCalendarMatrix } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ calendarId: string }> },
) {
  try {
    const { calendarId } = await params;
    return NextResponse.json(
      await createFiscalCalendarMatrix(
        await resolveAuthContext(request.headers),
        calendarId,
        await request.json(),
      ),
      { status: 201 },
    );
  } catch (error) {
    return firmCatalogError(error);
  }
}
