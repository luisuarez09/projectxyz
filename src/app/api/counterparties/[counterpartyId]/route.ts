import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import { archiveCommercialParty, getCommercialPartyProfile, updateCommercialParty } from "@/modules/commercial/application/commercial";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

type RouteContext = { params: Promise<{ counterpartyId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { counterpartyId } = await params;
    const url = new URL(request.url);
    return NextResponse.json(await getCommercialPartyProfile(await resolveAuthContext(request.headers), counterpartyId, url.searchParams.get("kind")));
  } catch (error) {
    return commercialError(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { counterpartyId } = await params;
    return NextResponse.json({ party: await updateCommercialParty(await resolveAuthContext(request.headers), counterpartyId, await request.json()) });
  } catch (error) {
    return commercialError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { counterpartyId } = await params;
    const url = new URL(request.url);
    return NextResponse.json(await archiveCommercialParty(await resolveAuthContext(request.headers), counterpartyId, url.searchParams.get("kind")));
  } catch (error) {
    return commercialError(error);
  }
}
