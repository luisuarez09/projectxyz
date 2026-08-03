import { NextResponse } from "next/server";

import { chartAccountError } from "@/app/api/chart-of-accounts/chart-account-error";
import { createCompanyChartAccount, getCompanyChartOfAccounts } from "@/modules/chart-of-accounts/application/chart-of-accounts";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try { return NextResponse.json(await getCompanyChartOfAccounts(await resolveAuthContext(request.headers))); }
  catch (error) { return chartAccountError(error); }
}

export async function POST(request: Request) {
  try {
    const account = await createCompanyChartAccount(await resolveAuthContext(request.headers), await request.json());
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) { return chartAccountError(error); }
}
