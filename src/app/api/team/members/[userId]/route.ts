import { NextResponse } from "next/server";

import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";
import { retireTeamMember, setTeamMemberActive, updateTeamMember } from "@/modules/identity/application/team";

function errorResponse(error: unknown) {
  const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationError ? 403 : 400;
  return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar la cuenta." }, { status });
}

export async function PUT(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const { userId } = await context.params;
    return NextResponse.json(await updateTeamMember(auth, userId, await request.json()));
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const { userId } = await context.params;
    const body = await request.json();
    return NextResponse.json(await setTeamMemberActive(auth, userId, Boolean(body.active)));
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const { userId } = await context.params;
    const body = await request.json();
    return NextResponse.json(await retireTeamMember(auth, userId, String(body.confirmation ?? "")));
  } catch (error) { return errorResponse(error); }
}
