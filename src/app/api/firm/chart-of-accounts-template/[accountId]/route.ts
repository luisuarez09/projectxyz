import { NextResponse } from "next/server";

import { chartAccountError } from "@/app/api/chart-of-accounts/chart-account-error";
import { deleteFirmTemplateAccount, updateFirmTemplateAccount } from "@/modules/chart-of-accounts/application/chart-of-accounts";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function PUT(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const { accountId } = await params;
    return NextResponse.json({ account: await updateFirmTemplateAccount(await resolveAuthContext(request.headers), accountId, await request.json()) });
  } catch (error) { return chartAccountError(error); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  try {
    const { accountId } = await params;
    return NextResponse.json(await deleteFirmTemplateAccount(await resolveAuthContext(request.headers), accountId));
  } catch (error) { return chartAccountError(error); }
}
