import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import { createCommercialParty, listCommercialParties } from "@/modules/commercial/application/commercial";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await listCommercialParties(await resolveAuthContext(request.headers), url.searchParams.get("kind")));
  } catch (error) {
    return commercialError(error);
  }
}

export async function POST(request: Request) {
  try {
    const party = await createCommercialParty(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json({ party }, { status: 201 });
  } catch (error) {
    return commercialError(error);
  }
}
