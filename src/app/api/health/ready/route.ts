import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/infrastructure/database/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await checkDatabaseHealth();

    return NextResponse.json({
      status: "ok",
      service: "web",
      checks: { database },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        service: "web",
        checks: { database: { status: "error" } },
      },
      { status: 503 },
    );
  }
}
