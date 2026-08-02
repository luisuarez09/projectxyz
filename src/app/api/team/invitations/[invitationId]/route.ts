import { NextResponse } from "next/server";

import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";
import { revokeInvitation } from "@/modules/identity/application/team";

export async function DELETE(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const { invitationId } = await context.params;
    return NextResponse.json(await revokeInvitation(auth, invitationId));
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationError ? 403 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible revocar la invitación." }, { status });
  }
}
