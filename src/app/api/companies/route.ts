import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createCompany, getCompanyDirectory } from "@/modules/companies/application/companies";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos de la empresa y sus registros relacionados." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible procesar las empresas.";
  return NextResponse.json({ error: message }, { status: message.includes("otra sesión") || message.includes("Ya existe") ? 409 : 400 });
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getCompanyDirectory(await resolveAuthContext(request.headers)));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const company = await createCompany(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
