import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { setActiveCompany } from "@/modules/companies/application/companies";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await setActiveCompany(await resolveAuthContext(request.headers), await request.json()));
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationError ? 403 : error instanceof ZodError ? 400 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cambiar la empresa activa." }, { status });
  }
}
