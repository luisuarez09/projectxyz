import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getFirmGeneralSettings, saveFirmGeneralSettings } from "@/modules/firm/application/general-settings";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

function respondToError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos legales y de contacto." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible guardar la configuración.";
  return NextResponse.json({ error: message }, { status: message.includes("otra sesión") ? 409 : 400 });
}

export async function GET(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json({ settings: await getFirmGeneralSettings(auth) });
  } catch (error) {
    return respondToError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json({ settings: await saveFirmGeneralSettings(auth, await request.json()) });
  } catch (error) {
    return respondToError(error);
  }
}
