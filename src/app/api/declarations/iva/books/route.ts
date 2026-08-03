import { calendarError } from "@/app/api/calendar/calendar-error";
import { exportIvaFiscalBook } from "@/modules/declarations/application/iva-books";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const result = await exportIvaFiscalBook(auth, await request.json());
    return new Response(Buffer.from(result.bytes), {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return calendarError(error);
  }
}
