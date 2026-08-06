import { NextResponse } from "next/server";

import {
  getEmployee,
  updateEmployee,
} from "@/modules/firm/employees/application/employees";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

function employeeError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.startsWith("CONFLICT:"))
      return NextResponse.json({ error: error.message.slice(9).trim() }, { status: 409 });
    const msg = error.message;
    if (msg.includes("obligatorio") || msg.includes("inválid") || msg.includes("no válid"))
      return NextResponse.json({ error: msg }, { status: 422 });
    if (msg.includes("autorizado") || msg.includes("activa"))
      return NextResponse.json({ error: msg }, { status: 403 });
    if (msg.includes("no encontrado"))
      return NextResponse.json({ error: msg }, { status: 404 });
  }
  console.error("[employees]", error);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const { employeeId } = await params;
    const employee = await getEmployee(
      await resolveAuthContext(request.headers),
      employeeId,
    );
    return NextResponse.json({ employee });
  } catch (error) {
    return employeeError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  try {
    const { employeeId } = await params;
    const employee = await updateEmployee(
      await resolveAuthContext(request.headers),
      employeeId,
      await request.json(),
    );
    return NextResponse.json({ employee });
  } catch (error) {
    return employeeError(error);
  }
}
