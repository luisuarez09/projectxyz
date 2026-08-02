import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { saveTaxRates } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await saveTaxRates(await resolveAuthContext(request.headers), await request.json()));
  } catch (error) { return firmCatalogError(error); }
}
