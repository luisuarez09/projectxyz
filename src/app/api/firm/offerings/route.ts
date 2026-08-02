import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { createFirmOffering } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ offering: await createFirmOffering(await resolveAuthContext(request.headers), await request.json()) }, { status: 201 });
  } catch (error) { return firmCatalogError(error); }
}
