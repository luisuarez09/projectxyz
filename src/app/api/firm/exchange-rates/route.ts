import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { createManualExchangeRate, listExchangeRates } from "@/modules/exchange-rates/application/exchange-rates";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await listExchangeRates(await resolveAuthContext(request.headers), {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return NextResponse.json(data);
  } catch (error) {
    return firmCatalogError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rate = await createManualExchangeRate(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    return firmCatalogError(error);
  }
}
