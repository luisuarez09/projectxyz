import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getFirmMailSettings, saveFirmMailSettings } from "@/modules/firm/application/mail-settings";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los campos de configuración." }, { status: 400 });
  return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible procesar la configuración." }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json({ settings: await getFirmMailSettings(auth) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const settings = await saveFirmMailSettings(auth, await request.json());
    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
