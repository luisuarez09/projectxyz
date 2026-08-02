import { NextResponse } from "next/server";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import {
  AuthenticationRequiredError,
  AuthorizationError,
  resolveAuthContext,
} from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const auth = await resolveAuthContext(request.headers);
    const account = await withAuthTransaction(auth, async (transaction) => {
      const now = new Date();
      const profile = await transaction.userProfile.findFirstOrThrow({
        where: { userId: auth.userId, firmId: auth.firmId, active: true },
        select: {
          displayName: true,
          position: true,
          profession: true,
          user: {
            select: {
              name: true,
              email: true,
              image: true,
              roleAssignments: {
                where: {
                  validFrom: { lte: now },
                  OR: [{ validUntil: null }, { validUntil: { gt: now } }],
                },
                orderBy: { validFrom: "asc" },
                take: 1,
                select: { role: { select: { name: true } } },
              },
            },
          },
        },
      });
      return {
        name: profile.displayName || profile.user.name,
        email: profile.user.email,
        image: profile.user.image,
        position:
          profile.position || profile.profession || "Integrante de la firma",
        role: profile.user.roleAssignments[0]?.role.name ?? "Sin rol asignado",
      };
    });
    return NextResponse.json({ account });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError)
      return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError)
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json(
      { error: "No fue posible cargar la cuenta." },
      { status: 400 },
    );
  }
}
