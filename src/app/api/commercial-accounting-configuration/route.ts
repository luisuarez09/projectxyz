import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import { getCommercialAccountingConfiguration, updateCommercialAccountingConfiguration } from "@/modules/commercial/application/commercial-settings";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getCommercialAccountingConfiguration(await resolveAuthContext(request.headers)));
  } catch (error) {
    return commercialError(error);
  }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await updateCommercialAccountingConfiguration(await resolveAuthContext(request.headers), await request.json()));
  } catch (error) {
    return commercialError(error);
  }
}
