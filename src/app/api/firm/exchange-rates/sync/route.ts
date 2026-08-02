import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { BcvResponseError } from "@/infrastructure/exchange-rates/bcv-client";
import { syncExchangeRates } from "@/modules/exchange-rates/application/exchange-rates";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await syncExchangeRates(await resolveAuthContext(request.headers)));
  } catch (error) {
    if (error instanceof BcvResponseError || error instanceof TypeError) {
      return NextResponse.json({ error: error.message || "No fue posible conectarse con el BCV." }, { status: 502 });
    }
    return firmCatalogError(error);
  }
}
