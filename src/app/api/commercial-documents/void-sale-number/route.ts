import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import { voidNextSalesInvoice } from "@/modules/commercial/application/commercial";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    const document = await voidNextSalesInvoice(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return commercialError(error);
  }
}
