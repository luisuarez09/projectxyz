import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getFirmGeneralSettings, saveFirmGeneralSettings } from "@/modules/firm/application/general-settings";
import { getTeamDirectory, inviteTeamMember, retireTeamMember, updateTeamMember } from "@/modules/identity/application/team";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const migrator = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });

describe("firm settings and team backend", () => {
  const suffix = randomUUID().slice(0, 8);
  const adminEmail = `admin-team-${suffix}@example.test`;
  const memberEmail = `member-team-${suffix}@example.test`;
  const invitedEmail = `invited-team-${suffix}@example.test`;
  let firmId = "";
  let adminId = "";
  let memberId = "";
  let adminRoleId = "";
  let collaboratorRoleId = "";
  let companyIds: string[] = [];
  let auth: AuthContext;

  beforeAll(async () => {
    await migrator.connect();
    firmId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, rif, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma Team ${suffix}`, `V-${suffix}`],
    )).rows[0].id;
    adminId = (await migrator.query<{ id: string }>(
      `INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ('Admin Test', $1, true, CURRENT_TIMESTAMP) RETURNING id`,
      [adminEmail],
    )).rows[0].id;
    memberId = (await migrator.query<{ id: string }>(
      `INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ('Member Test', $1, true, CURRENT_TIMESTAMP) RETURNING id`,
      [memberEmail],
    )).rows[0].id;
    await migrator.query(
      `INSERT INTO app.user_profiles (user_id, firm_id, display_name, position, profession, updated_at)
       VALUES ($1, $3, 'Admin Test', 'Administrador', 'Contador', CURRENT_TIMESTAMP),
              ($2, $3, 'Member Test', 'Analista', 'Contador', CURRENT_TIMESTAMP)`,
      [adminId, memberId, firmId],
    );
    for (const permission of Object.values(permissions)) {
      await migrator.query(
        `INSERT INTO app.permissions (key, description) VALUES ($1, $1) ON CONFLICT (key) DO NOTHING`,
        [permission],
      );
    }
    adminRoleId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.roles (firm_id, name, slug, is_system, updated_at) VALUES ($1, 'Administrador', $2, true, CURRENT_TIMESTAMP) RETURNING id`,
      [firmId, `administrador-${suffix}`],
    )).rows[0].id;
    collaboratorRoleId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.roles (firm_id, name, slug, is_system, updated_at) VALUES ($1, 'Colaborador', 'colaborador', true, CURRENT_TIMESTAMP) RETURNING id`,
      [firmId],
    )).rows[0].id;
    await migrator.query(
      `INSERT INTO app.role_permissions (role_id, permission_key)
       SELECT $1, unnest($2::text[])`,
      [adminRoleId, Object.values(permissions)],
    );
    companyIds = (await migrator.query<{ id: string }>(
      `INSERT INTO app.companies (firm_id, legal_name, rif, normalized_rif, updated_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP), ($1, $4, $5, $5, CURRENT_TIMESTAMP)
       RETURNING id`,
      [firmId, `Empresa A ${suffix}`, `J${suffix}A`, `Empresa B ${suffix}`, `J${suffix}B`],
    )).rows.map(({ id }) => id);
    await migrator.query(
      `INSERT INTO app.role_assignments (firm_id, user_id, role_id, scope)
       VALUES ($1, $2, $3, 'FIRM')`,
      [firmId, adminId, adminRoleId],
    );
    await migrator.query(
      `INSERT INTO app.role_assignments (firm_id, user_id, role_id, scope, company_id)
       VALUES ($1, $2, $3, 'COMPANY', $4)`,
      [firmId, memberId, collaboratorRoleId, companyIds[0]],
    );
    auth = {
      userId: adminId,
      firmId,
      activeCompanyId: companyIds[0],
      allowedCompanyIds: companyIds,
      permissionKeys: Object.values(permissions),
      firmScope: true,
    };
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM audit.audit_events WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.invitations WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.role_assignments WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.user_profiles WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.role_permissions WHERE role_id = ANY($1::uuid[])", [[adminRoleId, collaboratorRoleId]]);
    await migrator.query("DELETE FROM app.roles WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.companies WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM auth.users WHERE id = ANY($1::uuid[])", [[adminId, memberId]]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
  });

  it("persists firm settings with optimistic versioning and audit", async () => {
    const current = await getFirmGeneralSettings(auth);
    const input = {
      version: current.version,
      entityType: "NATURAL_PERSON",
      legalName: "Luis de prueba",
      tradeName: "",
      rif: `V-${suffix}`,
      fiscalAddress: "Caracas",
      email: adminEmail,
      phone: "0414-0000000",
      pdfHeader: "Encabezado persistido",
      pdfFooter: "Pie persistido",
      archivePaperSize: current.archivePaperSize,
      exchangeRateSyncStart: current.exchangeRateSyncStart,
      exchangeRateSyncEnd: current.exchangeRateSyncEnd,
      exchangeRateSyncInterval: current.exchangeRateSyncInterval,
      currencies: current.currencies,
    };
    const saved = await saveFirmGeneralSettings(auth, input);

    expect(saved).toMatchObject({ legalName: "Luis de prueba", version: current.version + 1, pdfHeader: "Encabezado persistido" });
    await expect(saveFirmGeneralSettings(auth, { ...input, version: current.version })).rejects.toThrow("otra sesión");
  });

  it("updates company-scoped access and creates a multi-company manual invitation", async () => {
    await updateTeamMember(auth, memberId, {
      name: "Member Updated",
      position: "Analista senior",
      profession: "Contador público",
      roleId: collaboratorRoleId,
      companyIds,
      version: 1,
    });
    const directory = await getTeamDirectory(auth);
    const member = directory.accounts.find((account) => account.kind === "MEMBER" && account.id === memberId);
    expect(member?.companies).toHaveLength(2);

    const invitation = await inviteTeamMember(auth, {
      name: "Invited Test",
      email: invitedEmail,
      position: "Asistente",
      profession: "Administración",
      roleId: collaboratorRoleId,
      companyIds,
    }, "http://localhost:3000");
    expect(invitation.delivery).toBe("MANUAL_LINK");
    expect(invitation.invitationUrl).toContain("/invitacion?token=");

    const access = await migrator.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM app.invitation_company_access WHERE invitation_id = $1`,
      [invitation.invitationId],
    );
    expect(access.rows[0].count).toBe("2");
  });

  it("retires access without deleting identity history", async () => {
    await retireTeamMember(auth, memberId, "ELIMINAR");
    const state = await migrator.query<{ active: boolean; retired_at: Date | null }>(
      `SELECT active, retired_at FROM app.user_profiles WHERE user_id = $1`,
      [memberId],
    );
    expect(state.rows[0].active).toBe(false);
    expect(state.rows[0].retired_at).toBeInstanceOf(Date);
  });
});
