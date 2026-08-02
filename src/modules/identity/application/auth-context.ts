import { getPrisma } from "@/infrastructure/database/prisma";
import type { AuthContext } from "@/modules/shared/application/context";
import { getAuth } from "@/modules/identity/infrastructure/auth";

export class AuthenticationRequiredError extends Error {}

export class AuthorizationError extends Error {}

export async function resolveAuthContext(
  requestHeaders: globalThis.Headers,
  requestedCompanyId?: string | null,
): Promise<AuthContext> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) throw new AuthenticationRequiredError("La sesión no es válida.");

  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.user_id', ${session.user.id}, true)`;

    const profile = await transaction.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { firmId: true, active: true, activeCompanyId: true },
    });
    if (!profile?.active) {
      throw new AuthorizationError("El perfil no está activo.");
    }

    await transaction.$executeRaw`SELECT set_config('app.firm_id', ${profile.firmId}, true)`;

    const baseAssignments = await transaction.roleAssignment.findMany({
      where: {
        userId: session.user.id,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { scope: true, companyId: true },
    });
    const firmScope = baseAssignments.some((assignment) => assignment.scope === "FIRM");
    await transaction.$executeRaw`SELECT set_config('app.firm_scope', ${String(firmScope)}, true)`;

    const scopedCompanyIds = baseAssignments.flatMap((assignment) =>
      assignment.companyId ? [assignment.companyId] : [],
    );
    await transaction.$executeRaw`SELECT set_config('app.allowed_company_ids', ${[...new Set(scopedCompanyIds)].join(",")}, true)`;

    const allowedCompanyIds = firmScope
      ? (await transaction.company.findMany({ select: { id: true } })).map(({ id }) => id)
      : [...new Set(scopedCompanyIds)];
    await transaction.$executeRaw`SELECT set_config('app.allowed_company_ids', ${allowedCompanyIds.join(",")}, true)`;

    const assignments = await transaction.roleAssignment.findMany({
      where: {
        userId: session.user.id,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: {
        role: {
          select: {
            permissions: { select: { permissionKey: true } },
          },
        },
      },
    });
    const permissionKeys = [...new Set(assignments.flatMap(({ role }) =>
      role.permissions.map(({ permissionKey }) => permissionKey),
    ))];
    const preferredCompanyId = requestedCompanyId === undefined ? profile.activeCompanyId : requestedCompanyId;
    const activeCompanyId = preferredCompanyId && allowedCompanyIds.includes(preferredCompanyId)
      ? preferredCompanyId
      : null;

    return {
      userId: session.user.id,
      firmId: profile.firmId,
      activeCompanyId,
      allowedCompanyIds,
      permissionKeys,
      firmScope,
    };
  });
}

export function requirePermission(context: AuthContext, permission: string): void {
  if (!context.permissionKeys.includes(permission)) {
    throw new AuthorizationError(`Falta el permiso requerido: ${permission}`);
  }
}
