import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { deleteFirmOffering, updateFirmOffering } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request, { params }: { params: Promise<{ offeringId: string }> }) {
  try {
    const { offeringId } = await params;
    return NextResponse.json({ offering: await updateFirmOffering(await resolveAuthContext(request.headers), offeringId, await request.json()) });
  } catch (error) { return firmCatalogError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ offeringId: string }> }) {
  try {
    const { offeringId } = await params;
    return NextResponse.json(await deleteFirmOffering(await resolveAuthContext(request.headers), offeringId));
  } catch (error) { return firmCatalogError(error); }
}
