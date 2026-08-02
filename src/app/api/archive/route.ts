import { NextResponse } from "next/server";

import { calendarError } from "@/app/api/calendar/calendar-error";
import { generateArchivePdf, getArchivePeriod } from "@/modules/archive/application/archive";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
    const companyId = url.searchParams.get("companyId");
    const auth = await resolveAuthContext(
      request.headers,
      companyId ?? undefined,
    );
    return NextResponse.json(await getArchivePeriod(auth, period, companyId));
  } catch (error) {
    return calendarError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const requestedCompanyId = typeof input?.companyId === "string" ? input.companyId : null;
    const auth = await resolveAuthContext(request.headers, requestedCompanyId);
    const result = await generateArchivePdf(auth, input);
    return new Response(Buffer.from(result.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return calendarError(error);
  }
}
