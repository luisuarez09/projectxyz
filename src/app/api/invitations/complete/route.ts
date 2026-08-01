import { z } from "zod";

import { completeInvitation } from "@/modules/identity/application/invitations";

const requestSchema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: Request): Promise<Response> {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const completed = await completeInvitation(parsed.data.token);
  return Response.json({ ok: completed }, { status: completed ? 200 : 400 });
}
