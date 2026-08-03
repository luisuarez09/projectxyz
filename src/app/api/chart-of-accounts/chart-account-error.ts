import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthenticationRequiredError, AuthorizationError } from "@/modules/identity/application/auth-context";

export function chartAccountError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa el código, nombre y clasificación de la cuenta." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible procesar el plan de cuentas.";
  const status = message.includes("otra sesión") || message.includes("Ya existe") ? 409 : message.includes("No record") ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}
