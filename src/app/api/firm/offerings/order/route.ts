import { NextResponse } from "next/server";

import { firmCatalogError } from "@/app/api/firm/catalog-error";
import { saveFirmOfferingOrder } from "@/modules/firm/application/catalog";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json({
      offerings: await saveFirmOfferingOrder(auth, await request.json()),
    });
  } catch (error) {
    return firmCatalogError(error);
  }
}
