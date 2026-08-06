import { NextResponse } from "next/server";

import {
  createEmployee,
  listEmployees,
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

export async function GET(request: Request) {
  try {
    const data = await listEmployees(await resolveAuthContext(request.headers));
    return NextResponse.json(data);
  } catch (error) {
    return employeeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const employee = await createEmployee(
      await resolveAuthContext(request.headers),
      await request.json(),
    );
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return employeeError(error);
  }
}
