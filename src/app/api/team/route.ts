import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";
import { getTeamDirectory, inviteTeamMember } from "@/modules/identity/application/team";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError) return NextResponse.json({ error: "Revisa los datos del integrante." }, { status: 400 });
  return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible procesar el equipo." }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json(await getTeamDirectory(auth));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    return NextResponse.json(await inviteTeamMember(auth, await request.json(), appUrl), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
