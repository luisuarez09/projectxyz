import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import { voidCommercialDocument } from "@/modules/commercial/application/commercial";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    const { documentId, reason } = await request.json();
    const document = await voidCommercialDocument(
      await resolveAuthContext(request.headers),
      documentId,
      reason
    );
    return NextResponse.json({ document }, { status: 200 });
  } catch (error) {
    return commercialError(error);
  }
}
