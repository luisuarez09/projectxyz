import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationError,
} from "@/modules/identity/application/auth-context";

export function calendarError(error: unknown) {
  if (error instanceof AuthenticationRequiredError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError)
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Revisa los datos del calendario." },
      { status: 400 },
    );
  const message = error instanceof Error
    ? error.message
    : "No fue posible procesar el calendario.";
  return NextResponse.json(
    { error: message },
    { status: message.includes("otra sesión") ? 409 : 400 },
  );
}
