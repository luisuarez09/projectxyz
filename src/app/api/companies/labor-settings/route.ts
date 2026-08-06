import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getLaborSettings, upsertLaborSettings } from "@/modules/firm/employees/application/labor-settings";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos del formulario." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible procesar la configuración.";
  return NextResponse.json({ error: message }, { status: message.includes("otra sesión") ? 409 : 400 });
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getLaborSettings(await resolveAuthContext(request.headers)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const settings = await upsertLaborSettings(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
