import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { archiveCompany, getCompany, updateCompany } from "@/modules/companies/application/companies";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos de la empresa." }, { status: 400 });
  const message = error instanceof Error ? error.message : "No fue posible procesar la empresa.";
  return NextResponse.json({ error: message }, { status: message.includes("otra sesión") || message.includes("Ya existe") ? 409 : 400 });
}

export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    return NextResponse.json({ company: await getCompany(await resolveAuthContext(request.headers, companyId), companyId) });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    return NextResponse.json({ company: await updateCompany(await resolveAuthContext(request.headers, companyId), companyId, await request.json()) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;
    return NextResponse.json(await archiveCompany(await resolveAuthContext(request.headers, companyId), companyId, await request.json()));
  } catch (error) { return errorResponse(error); }
}
