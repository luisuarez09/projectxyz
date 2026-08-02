import { NextResponse } from "next/server";

import { testFirmMailConnection } from "@/modules/firm/application/mail-settings";
import { AuthenticationRequiredError, AuthorizationError, resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    return NextResponse.json({ settings: await testFirmMailConnection(auth) });
  } catch (error) {
    const status = error instanceof AuthenticationRequiredError ? 401 : error instanceof AuthorizationError ? 403 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible probar la conexión." }, { status });
  }
}
