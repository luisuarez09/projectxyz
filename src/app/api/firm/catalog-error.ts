import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthenticationRequiredError, AuthorizationError } from "@/modules/identity/application/auth-context";

export function firmCatalogError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos de configuración." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible procesar la configuración.";
  return NextResponse.json({ error: message }, { status: message.includes("otra sesión") ? 409 : 400 });
}
