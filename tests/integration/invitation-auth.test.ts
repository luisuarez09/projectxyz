import { randomBytes, randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPrisma } from "@/infrastructure/database/prisma";
import {
  completeInvitation,
  hashInvitationToken,
} from "@/modules/identity/application/invitations";
import { getAuth } from "@/modules/identity/infrastructure/auth";

const migrator = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });

describe("invitation-only authentication", () => {
  const suffix = randomUUID().slice(0, 8);
  const invitedEmail = `invitada-${suffix}@example.test`;
  const inviterEmail = `admin-${suffix}@example.test`;
  const token = randomBytes(32).toString("base64url");
  let firmId = "";
  let roleId = "";
  let inviterId = "";
  let invitationId = "";
  let invitedUserId = "";

  beforeAll(async () => {
    await migrator.connect();
    firmId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma invitación ${suffix}`],
    )).rows[0].id;
    inviterId = (await migrator.query<{ id: string }>(
      `INSERT INTO auth.users (name, email, email_verified, updated_at)
       VALUES ($1, $2, true, CURRENT_TIMESTAMP) RETURNING id`,
      ["Administradora", inviterEmail],
    )).rows[0].id;
    roleId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.roles (firm_id, name, slug, is_system, updated_at)
       VALUES ($1, 'Colaborador', $2, true, CURRENT_TIMESTAMP) RETURNING id`,
      [firmId, `colaborador-${suffix}`],
    )).rows[0].id;
    invitationId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.invitations
         (firm_id, email, name, role_id, scope, token_hash, expires_at,
          invited_by_user_id, updated_at)
       VALUES ($1, $2, 'Persona Invitada', $3, 'FIRM', $4,
               CURRENT_TIMESTAMP + interval '48 hours', $5, CURRENT_TIMESTAMP)
       RETURNING id`,
      [firmId, invitedEmail, roleId, hashInvitationToken(token), inviterId],
    )).rows[0].id;
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM audit.audit_events WHERE entity_id = $1", [invitationId]);
    await migrator.query("DELETE FROM app.role_assignments WHERE user_id = $1", [invitedUserId || null]);
    await migrator.query("DELETE FROM app.user_profiles WHERE user_id = $1", [invitedUserId || null]);
    await migrator.query("DELETE FROM app.invitations WHERE id = $1", [invitationId]);
    if (invitedUserId) {
      await migrator.query("DELETE FROM auth.accounts WHERE user_id = $1", [invitedUserId]);
      await migrator.query("DELETE FROM auth.users WHERE id = $1", [invitedUserId]);
    }
    await migrator.query("DELETE FROM app.roles WHERE id = $1", [roleId]);
    await migrator.query("DELETE FROM auth.users WHERE id = $1", [inviterId]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
    await getPrisma().$disconnect();
  });

  it("rejects public signup and accepts the matching one-time token", async () => {
    const body = {
      email: invitedEmail,
      name: "Persona Invitada",
      password: "Clave-Segura-2026!",
    };
    const publicAttempt = await getAuth().handler(new Request(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ));
    expect(publicAttempt.ok).toBe(false);

    const invitedAttempt = await getAuth().handler(new Request(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-proyectoxyz-invitation": token,
        },
        body: JSON.stringify(body),
      },
    ));
    expect(invitedAttempt.status).toBe(200);

    expect(await completeInvitation(token)).toBe(true);
    const state = await migrator.query<{
      id: string;
      email_verified: boolean;
      status: string;
      assignments: string;
    }>(
      `SELECT u.id, u.email_verified, i.status,
              count(ra.id)::text AS assignments
       FROM auth.users u
       JOIN app.user_profiles p ON p.user_id = u.id
       JOIN app.invitations i ON i.accepted_by_user_id = u.id
       LEFT JOIN app.role_assignments ra ON ra.user_id = u.id
       WHERE u.email = $1
       GROUP BY u.id, i.status`,
      [invitedEmail],
    );

    invitedUserId = state.rows[0].id;
    expect(state.rows[0]).toMatchObject({
      email_verified: true,
      status: "ACCEPTED",
      assignments: "1",
    });
    expect(await completeInvitation(token)).toBe(false);
  });
});
