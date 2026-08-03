import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthenticationRequiredError, AuthorizationError } from "@/modules/identity/application/auth-context";
import { CommercialConflictError, CommercialNotFoundError } from "@/modules/commercial/application/commercial";

export function commercialError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof CommercialNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof CommercialConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos fiscales, cuentas e importes indicados." }, { status: 400 });
  return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible procesar la operación comercial." }, { status: 400 });
}
