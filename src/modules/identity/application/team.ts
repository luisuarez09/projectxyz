import { randomUUID } from "node:crypto";

import { z } from "zod";

import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { AuthorizationError, requirePermission } from "@/modules/identity/application/auth-context";
import { createInvitation } from "@/modules/identity/application/invitations";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const companyIdsSchema = z.array(z.uuid()).max(100);

export const inviteTeamMemberSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  position: z.string().trim().min(2).max(160),
  profession: z.string().trim().min(2).max(160),
  roleId: z.uuid(),
  companyIds: companyIdsSchema,
});

export const updateTeamMemberSchema = z.object({
  name: z.string().trim().min(2).max(160),
  position: z.string().trim().min(2).max(160),
  profession: z.string().trim().min(2).max(160),
  roleId: z.uuid(),
  companyIds: companyIdsSchema,
  version: z.number().int().positive(),
});

function assertFirmTeamAccess(auth: AuthContext, permission: string) {
  if (!auth.firmScope) throw new AuthorizationError("La gestión de equipo requiere acceso a toda la firma.");
  requirePermission(auth, permission);
}

export async function getTeamDirectory(auth: AuthContext) {
  assertFirmTeamAccess(auth, permissions.teamRead);
  return withAuthTransaction(auth, async (transaction) => {
    const now = new Date();
    const [profiles, invitations, roles, companies] = await Promise.all([
      transaction.userProfile.findMany({
        where: { firmId: auth.firmId, profileType: "STAFF", retiredAt: null },
        orderBy: { displayName: "asc" },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              twoFactorEnabled: true,
              sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
              roleAssignments: {
                where: { validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
                include: { role: { select: { id: true, name: true, slug: true } }, company: { select: { id: true, legalName: true } } },
              },
            },
          },
        },
      }),
      transaction.invitation.findMany({
        where: { firmId: auth.firmId, profileType: "STAFF", status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          role: { select: { id: true, name: true, slug: true } },
          companyAccess: { include: { company: { select: { id: true, legalName: true } } } },
        },
      }),
      transaction.role.findMany({
        where: { firmId: auth.firmId, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, description: true, isSystem: true },
      }),
      transaction.company.findMany({
        where: { firmId: auth.firmId, status: "ACTIVE" },
        orderBy: { legalName: "asc" },
        select: { id: true, legalName: true },
      }),
    ]);

    const members = profiles.map((profile) => {
      const primaryAssignment = profile.user.roleAssignments[0];
      const firmWide = profile.user.roleAssignments.some(({ scope }) => scope === "FIRM");
      return {
        kind: "MEMBER" as const,
        id: profile.userId,
        version: profile.version,
        name: profile.displayName,
        email: profile.user.email,
        position: profile.position ?? "Sin cargo definido",
        profession: profile.profession ?? "Sin profesión definida",
        active: profile.active,
        role: primaryAssignment?.role ?? null,
        firmWide,
        companies: firmWide ? companies : profile.user.roleAssignments.flatMap(({ company }) => company ? [company] : []),
        lastAccessAt: profile.user.sessions[0]?.updatedAt ?? null,
        mfaEnabled: Boolean(profile.user.twoFactorEnabled),
      };
    });
    const pending = invitations.map((invitation) => ({
      kind: "INVITATION" as const,
      id: invitation.id,
      version: 1,
      name: invitation.name,
      email: invitation.email,
      position: invitation.position ?? "Sin cargo definido",
      profession: invitation.profession ?? "Sin profesión definida",
      active: false,
      role: invitation.role,
      firmWide: invitation.scope === "FIRM",
      companies: invitation.scope === "FIRM" ? companies : invitation.companyAccess.map(({ company }) => company),
      lastAccessAt: null,
      mfaEnabled: false,
      expiresAt: invitation.expiresAt,
      expired: invitation.expiresAt <= now,
      delivery: invitation.lastDeliveryMethod,
    }));

    return { accounts: [...members, ...pending], roles, companies };
  });
}

async function validateRoleAndCompanies(
  auth: AuthContext,
  roleId: string,
  companyIds: string[],
) {
  return withAuthTransaction(auth, async (transaction) => {
    const role = await transaction.role.findFirst({
      where: { id: roleId, firmId: auth.firmId, archivedAt: null },
      select: { id: true, slug: true },
    });
    if (!role) throw new Error("El rol seleccionado no pertenece a la firma.");
    const uniqueCompanyIds = [...new Set(companyIds)];
    const companyCount = await transaction.company.count({
      where: { id: { in: uniqueCompanyIds }, firmId: auth.firmId, status: "ACTIVE" },
    });
    if (companyCount !== uniqueCompanyIds.length) throw new Error("Una empresa seleccionada no está disponible.");
    const firmWide = role.slug === "administrador";
    if (!firmWide && uniqueCompanyIds.length === 0) {
      throw new Error("Selecciona al menos una empresa para este rol.");
    }
    return { role, companyIds: firmWide ? [] : uniqueCompanyIds, firmWide };
  });
}

export async function inviteTeamMember(auth: AuthContext, rawInput: unknown, appUrl: string) {
  assertFirmTeamAccess(auth, permissions.teamInvite);
  const input = inviteTeamMemberSchema.parse(rawInput);
  const access = await validateRoleAndCompanies(auth, input.roleId, input.companyIds);
  const duplicate = await withAuthTransaction(auth, (transaction) => transaction.invitation.findFirst({
    where: { firmId: auth.firmId, email: input.email, status: "PENDING" },
    select: { id: true },
  }));
  if (duplicate) throw new Error("Ya existe una invitación pendiente para este correo.");

  const result = await createInvitation({
    auth,
    appUrl,
    email: input.email,
    name: input.name,
    position: input.position,
    profession: input.profession,
    roleId: input.roleId,
    profileType: "STAFF",
    scope: access.firmWide ? "FIRM" : "COMPANY",
    companyIds: access.companyIds,
  });

  return result;
}

export async function updateTeamMember(auth: AuthContext, userId: string, rawInput: unknown) {
  assertFirmTeamAccess(auth, permissions.teamManage);
  const input = updateTeamMemberSchema.parse(rawInput);
  const access = await validateRoleAndCompanies(auth, input.roleId, input.companyIds);

  return withAuthTransaction(auth, async (transaction) => {
    const profile = await transaction.userProfile.findFirst({
      where: { userId, firmId: auth.firmId, retiredAt: null },
      select: { id: true, version: true },
    });
    if (!profile) throw new Error("El integrante no está disponible.");
    if (profile.version !== input.version) throw new Error("La cuenta cambió en otra sesión. Recarga antes de guardar.");

    if (userId === auth.userId) {
      const now = new Date();
      const currentAssignments = await transaction.roleAssignment.findMany({
        where: { userId, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        select: { roleId: true, scope: true, companyId: true },
      });
      const currentFirmWide = currentAssignments.some(({ scope }) => scope === "FIRM");
      const currentCompanyIds = currentAssignments.flatMap(({ companyId }) => companyId ? [companyId] : []).sort();
      const requestedCompanyIds = [...access.companyIds].sort();
      if (currentAssignments[0]?.roleId !== input.roleId || currentFirmWide !== access.firmWide ||
          currentCompanyIds.join(",") !== requestedCompanyIds.join(",")) {
        throw new Error("No puedes cambiar tu propio rol ni alcance de acceso.");
      }
    }

    await transaction.userProfile.update({
      where: { id: profile.id },
      data: {
        displayName: input.name,
        position: input.position,
        profession: input.profession,
        version: { increment: 1 },
      },
    });
    await transaction.user.update({ where: { id: userId }, data: { name: input.name } });

    if (userId !== auth.userId) {
      const now = new Date();
      await transaction.roleAssignment.updateMany({
        where: { firmId: auth.firmId, userId, validUntil: null },
        data: { validUntil: new Date(now.getTime() + 1) },
      });
      const assignments = access.firmWide
        ? [{ scope: "FIRM" as const, companyId: null }]
        : access.companyIds.map((companyId) => ({ scope: "COMPANY" as const, companyId }));
      for (const assignment of assignments) {
        const existing = await transaction.roleAssignment.findFirst({
          where: { userId, roleId: input.roleId, scope: assignment.scope, companyId: assignment.companyId, branchId: null },
          select: { id: true },
        });
        if (existing) {
          await transaction.roleAssignment.update({ where: { id: existing.id }, data: { validFrom: now, validUntil: null } });
        } else {
          await transaction.roleAssignment.create({ data: {
            firmId: auth.firmId,
            userId,
            roleId: input.roleId,
            scope: assignment.scope,
            companyId: assignment.companyId,
          } });
        }
      }
    }
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "identity.team_member.updated",
        entityType: "user_profile",
        entityId: profile.id,
        metadata: { roleId: input.roleId, companyCount: access.companyIds.length, firmWide: access.firmWide },
      },
    });
    return { ok: true };
  });
}

export async function setTeamMemberActive(auth: AuthContext, userId: string, active: boolean) {
  assertFirmTeamAccess(auth, permissions.teamManage);
  if (userId === auth.userId) throw new Error("No puedes desactivar tu propia cuenta.");
  return withAuthTransaction(auth, async (transaction) => {
    const profile = await transaction.userProfile.findFirstOrThrow({
      where: { userId, firmId: auth.firmId, retiredAt: null },
    });
    await transaction.userProfile.update({
      where: { id: profile.id },
      data: { active, version: { increment: 1 } },
    });
    if (!active) await transaction.session.deleteMany({ where: { userId } });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: active ? "identity.team_member.reactivated" : "identity.team_member.deactivated",
        entityType: "user_profile",
        entityId: profile.id,
        metadata: {},
      },
    });
    return { ok: true };
  });
}

export async function retireTeamMember(auth: AuthContext, userId: string, confirmation: string) {
  assertFirmTeamAccess(auth, permissions.teamManage);
  if (confirmation !== "ELIMINAR") throw new Error("La confirmación no coincide.");
  if (userId === auth.userId) throw new Error("No puedes retirar tu propia cuenta.");
  return withAuthTransaction(auth, async (transaction) => {
    const profile = await transaction.userProfile.findFirstOrThrow({
      where: { userId, firmId: auth.firmId, retiredAt: null },
    });
    const now = new Date();
    await transaction.userProfile.update({
      where: { id: profile.id },
      data: { active: false, retiredAt: now, version: { increment: 1 } },
    });
    await transaction.roleAssignment.updateMany({
      where: { firmId: auth.firmId, userId, validUntil: null },
      data: { validUntil: new Date(now.getTime() + 1) },
    });
    await transaction.session.deleteMany({ where: { userId } });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "identity.team_member.retired",
        entityType: "user_profile",
        entityId: profile.id,
        metadata: { historyPreserved: true },
      },
    });
    return { ok: true };
  });
}

export async function revokeInvitation(auth: AuthContext, invitationId: string) {
  assertFirmTeamAccess(auth, permissions.teamInvite);
  return withAuthTransaction(auth, async (transaction) => {
    const invitation = await transaction.invitation.findFirstOrThrow({
      where: { id: invitationId, firmId: auth.firmId, status: "PENDING" },
    });
    await transaction.invitation.update({ where: { id: invitation.id }, data: { status: "REVOKED" } });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: "identity.invitation.revoked",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {},
      },
    });
    return { ok: true };
  });
}
