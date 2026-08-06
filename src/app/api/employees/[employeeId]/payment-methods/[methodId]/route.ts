import { NextResponse } from "next/server";

import { deletePaymentMethod } from "@/modules/firm/employees/application/employees";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; methodId: string }> },
) {
  try {
    const { employeeId, methodId } = await params;
    await deletePaymentMethod(
      await resolveAuthContext(request.headers),
      employeeId,
      methodId,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("no encontrado"))
        return NextResponse.json({ error: msg }, { status: 404 });
      if (msg.includes("autorizado") || msg.includes("activa"))
        return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error("[employees/payment-methods/delete]", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
