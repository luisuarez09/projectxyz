import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { addCalendarEvidence } from "@/modules/calendar/application/calendar";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

const allowedContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const maximumSize = 20 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || typeof kind !== "string")
      throw new Error("Selecciona el tipo de evidencia y el archivo.");
    if (!file.size || file.size > maximumSize)
      throw new Error("El archivo debe pesar menos de 20 MB.");
    if (!allowedContentTypes.has(file.type))
      throw new Error("Usa un archivo PDF, JPG o PNG.");
    return NextResponse.json({
      evidence: await addCalendarEvidence(
        await resolveAuthContext(request.headers),
        caseId,
        kind,
        {
          name: file.name,
          contentType: file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        },
      ),
    }, { status: 201 });
  } catch (error) {
    return calendarError(error);
  }
}
