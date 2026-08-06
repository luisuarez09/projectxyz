import { NextResponse } from "next/server";

import { addPaymentMethod } from "@/modules/firm/employees/application/employees";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

function employeeError(error: unknown) {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("obligatorio") || msg.includes("inválid") || msg.includes("no válid"))
      return NextResponse.json({ error: msg }, { status: 422 });
    if (msg.includes("autorizado") || msg.includes("activa"))
      return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("no encontrado"))
      return NextResponse.json({ error: msg }, { status: 404 });
  }
  console.error("[employees/payment-methods]", error);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const { employeeId } = await params;
    const method = await addPaymentMethod(
      await resolveAuthContext(request.headers),
      employeeId,
      await request.json(),
    );
    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    return employeeError(error);
  }
}
