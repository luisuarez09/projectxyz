import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { getFirmCatalog } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getFirmCatalog(await resolveAuthContext(request.headers)));
  } catch (error) { return firmCatalogError(error); }
}
