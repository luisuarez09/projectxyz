import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getPrisma } from "@/infrastructure/database/prisma";
import { invitationEmail } from "@/modules/identity/application/identity-mail-templates";
import type { AuthContext } from "@/modules/shared/application/context";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";
import { getEnabledFirmMailDelivery } from "@/modules/firm/application/enabled-mail-delivery";

const INVITATION_HEADER = "x-proyectoxyz-invitation";

export type InvitationPreview = {
  firmName: string;
  name: string;
  email: string;
  roleName: string;
  expiresAt: Date;
};

export function invitationHeaderName(): string {
  return INVITATION_HEADER;
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function validateInvitationToken(
  token: string,
  expectedEmail?: string,
): Promise<InvitationPreview | null> {
  if (token.length < 32) return null;
  const tokenHash = hashInvitationToken(token);

  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.invitation_token_hash', ${tokenHash}, true)`;
    const invitation = await transaction.invitation.findUnique({
      where: { tokenHash },
      select: {
        status: true,
        expiresAt: true,
        email: true,
        name: true,
        firmId: true,
        roleId: true,
      },
    });

    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
      return null;
    }
    if (expectedEmail && invitation.email.toLowerCase() !== expectedEmail.toLowerCase()) {
      return null;
    }

    await transaction.$executeRaw`SELECT set_config('app.firm_id', ${invitation.firmId}, true)`;
    const firm = await transaction.firm.findUnique({
      where: { id: invitation.firmId },
      select: { legalName: true },
    });
    const role = await transaction.role.findUnique({
      where: { id: invitation.roleId },
      select: { name: true },
    });
    if (!firm || !role) return null;

    return {
      firmName: firm.legalName,
      name: invitation.name,
      email: invitation.email,
      roleName: role.name,
      expiresAt: invitation.expiresAt,
    };
  });
}

export async function completeInvitation(token: string): Promise<boolean> {
  if (token.length < 32) return false;
  const tokenHash = hashInvitationToken(token);

  return getPrisma().$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.invitation_token_hash', ${tokenHash}, true)`;
    const invitation = await transaction.invitation.findUnique({
      where: { tokenHash },
      include: { companyAccess: { select: { companyId: true } } },
    });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
      return false;
    }

    const user = await transaction.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) return false;

    await transaction.$executeRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
    await transaction.$executeRaw`SELECT set_config('app.firm_id', ${invitation.firmId}, true)`;
    await transaction.$executeRaw`SELECT set_config('app.firm_scope', 'false', true)`;
    await transaction.$executeRaw`SELECT set_config('app.allowed_company_ids', ${invitation.companyId ?? ""}, true)`;

    await transaction.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    await transaction.userProfile.create({
      data: {
        userId: user.id,
        firmId: invitation.firmId,
        displayName: invitation.name,
        profileType: invitation.profileType,
        position: invitation.position,
        profession: invitation.profession,
      },
    });
    const companyIds = invitation.companyAccess.map(({ companyId }) => companyId);
    if (invitation.scope === "COMPANY" && companyIds.length > 0) {
      await transaction.roleAssignment.createMany({
        data: companyIds.map((companyId) => ({
          firmId: invitation.firmId,
          userId: user.id,
          roleId: invitation.roleId,
          scope: "COMPANY" as const,
          companyId,
        })),
      });
    } else {
      await transaction.roleAssignment.create({
        data: {
          firmId: invitation.firmId,
          userId: user.id,
          roleId: invitation.roleId,
          scope: invitation.scope,
          companyId: invitation.companyId,
          branchId: invitation.branchId,
        },
      });
    }
    await transaction.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedByUserId: user.id,
        acceptedAt: new Date(),
      },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: invitation.firmId,
        actorUserId: user.id,
        requestId: randomUUID(),
        eventType: "identity.invitation.accepted",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { scope: invitation.scope, companyCount: companyIds.length },
      },
    });

    return true;
  });
}

export async function createInvitation(input: {
  auth: AuthContext;
  appUrl: string;
  email: string;
  name: string;
  position?: string;
  profession?: string;
  roleId: string;
  profileType: "STAFF" | "CLIENT";
  scope: "FIRM" | "COMPANY" | "BRANCH";
  companyId?: string;
  companyIds?: string[];
  branchId?: string;
}): Promise<{ invitationId: string; delivery: "SMTP" | "MANUAL_LINK"; invitationUrl?: string }> {
  if (!input.auth.firmScope || !input.auth.permissionKeys.includes("team.invite")) {
    throw new Error("No tienes permiso para invitar usuarios.");
  }

  const email = input.email.trim().toLowerCase();
  const existingUser = await getPrisma().user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) throw new Error("El correo ya tiene una cuenta activa.");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invitation = await withAuthTransaction(input.auth, async (transaction) => {
    const companyIds = [...new Set(input.companyIds ?? (input.companyId ? [input.companyId] : []))];
    const created = await transaction.invitation.create({
      data: {
        firmId: input.auth.firmId,
        email,
        name: input.name.trim(),
        position: input.position?.trim(),
        profession: input.profession?.trim(),
        roleId: input.roleId,
        profileType: input.profileType,
        scope: input.scope,
        companyId: companyIds[0],
        branchId: input.branchId,
        tokenHash,
        expiresAt,
        invitedByUserId: input.auth.userId,
      },
      include: { firm: { select: { legalName: true } } },
    });
    if (companyIds.length > 0) {
      await transaction.invitationCompanyAccess.createMany({
        data: companyIds.map((companyId) => ({ invitationId: created.id, companyId })),
      });
    }
    await transaction.auditEvent.create({
      data: {
        firmId: input.auth.firmId,
        actorUserId: input.auth.userId,
        requestId: randomUUID(),
        eventType: "identity.invitation.created",
        entityType: "invitation",
        entityId: created.id,
        metadata: { scope: input.scope, companyCount: companyIds.length },
      },
    });
    return created;
  });

  const url = new URL("/invitacion", input.appUrl);
  url.searchParams.set("token", token);
  const delivery = await getEnabledFirmMailDelivery(input.auth);
  if (delivery) {
    try {
      await delivery.send(invitationEmail({
        to: email,
        name: input.name.trim(),
        firmName: invitation.firm.legalName,
        url: url.toString(),
      }));
      await markInvitationDelivery(input.auth, invitation.id, "SMTP");
      return { invitationId: invitation.id, delivery: "SMTP" };
    } catch {
      // The authenticated administrator receives a one-time link as a safe fallback.
    }
  }

  await markInvitationDelivery(input.auth, invitation.id, "MANUAL_LINK");
  return { invitationId: invitation.id, delivery: "MANUAL_LINK", invitationUrl: url.toString() };
}

async function markInvitationDelivery(
  auth: AuthContext,
  invitationId: string,
  method: "SMTP" | "MANUAL_LINK",
) {
  await withAuthTransaction(auth, async (transaction) => {
    await transaction.invitation.update({
      where: { id: invitationId },
      data: { lastDeliveryMethod: method, lastDeliveredAt: new Date() },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: auth.firmId,
        actorUserId: auth.userId,
        requestId: randomUUID(),
        eventType: method === "SMTP" ? "identity.invitation.sent" : "identity.invitation.link_issued",
        entityType: "invitation",
        entityId: invitationId,
        metadata: { delivery: method },
      },
    });
  });
}
