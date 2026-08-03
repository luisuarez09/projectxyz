import { NextResponse } from "next/server";

import { chartAccountError } from "@/app/api/chart-of-accounts/chart-account-error";
import { applyFirmChartTemplate } from "@/modules/chart-of-accounts/application/chart-of-accounts";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function POST(request: Request) {
  try { return NextResponse.json(await applyFirmChartTemplate(await resolveAuthContext(request.headers))); }
  catch (error) { return chartAccountError(error); }
}
