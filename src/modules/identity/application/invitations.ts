import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getPrisma } from "@/infrastructure/database/prisma";
import { createSmtpMailDelivery } from "@/infrastructure/mail/smtp-mail-delivery";
import { invitationEmail } from "@/modules/identity/application/identity-mail-templates";
import type { AuthContext } from "@/modules/shared/application/context";
import { withAuthTransaction } from "@/infrastructure/database/auth-transaction";

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
    const invitation = await transaction.invitation.findUnique({ where: { tokenHash } });
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
      },
    });
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
        metadata: { scope: invitation.scope },
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
  roleId: string;
  profileType: "STAFF" | "CLIENT";
  scope: "FIRM" | "COMPANY" | "BRANCH";
  companyId?: string;
  branchId?: string;
}): Promise<{ invitationId: string }> {
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
    const created = await transaction.invitation.create({
      data: {
        firmId: input.auth.firmId,
        email,
        name: input.name.trim(),
        roleId: input.roleId,
        profileType: input.profileType,
        scope: input.scope,
        companyId: input.companyId,
        branchId: input.branchId,
        tokenHash,
        expiresAt,
        invitedByUserId: input.auth.userId,
      },
      include: { firm: { select: { legalName: true } } },
    });
    await transaction.auditEvent.create({
      data: {
        firmId: input.auth.firmId,
        actorUserId: input.auth.userId,
        requestId: randomUUID(),
        eventType: "identity.invitation.created",
        entityType: "invitation",
        entityId: created.id,
        metadata: { scope: input.scope },
      },
    });
    return created;
  });

  const url = new URL("/invitacion", input.appUrl);
  url.searchParams.set("token", token);
  await createSmtpMailDelivery().send(invitationEmail({
    to: email,
    name: input.name.trim(),
    firmName: invitation.firm.legalName,
    url: url.toString(),
  }));

  return { invitationId: invitation.id };
}
