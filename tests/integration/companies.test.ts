import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveCompany,
  createCompany,
  getCompanyDirectory,
  setActiveCompany,
  updateCompany,
} from "@/modules/companies/application/companies";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const migrator = new Client({
  connectionString: process.env.DIRECT_DATABASE_URL,
});

describe("company management backend", () => {
  const suffix = randomUUID().slice(0, 8);
  let firmId = "";
  let userId = "";
  let profileId = "";
  let roleId = "";
  let companyId = "";
  let auth: AuthContext;

  beforeAll(async () => {
    await migrator.connect();
    firmId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.firms (legal_name, rif, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id`,
        [`Firma Empresas ${suffix}`, `V-${suffix}`],
      )
    ).rows[0].id;
    await migrator.query(
      `INSERT INTO app.firm_offerings
        (firm_id, key, kind, name, organism, frequency, deadline_mode, deadline_day_count, deadline_day_type, deadline_base, active, updated_at)
       VALUES
        ($1, 'iva', 'TAX', 'IVA', 'SENIAT', 'Mensual', 'days', 15, 'business', 'period-start', true, CURRENT_TIMESTAMP),
        ($1, 'municipal', 'TAX', 'Impuesto municipal', 'Alcaldía', 'Mensual', 'days', 10, 'business', 'period-start', true, CURRENT_TIMESTAMP),
        ($1, 'inces', 'TAX', 'INCES', 'INCES', 'Trimestral', 'days', 10, 'business', 'period-start', true, CURRENT_TIMESTAMP),
        ($1, 'iva-spe', 'TAX', 'IVA SPE', 'SENIAT', 'Quincenal', 'official-calendar', 0, 'calendar', 'period-end', true, CURRENT_TIMESTAMP),
        ($1, 'agua', 'SERVICE', 'Agua', 'Prestador', 'Según factura', 'document-date', 0, 'calendar', 'document-date', true, CURRENT_TIMESTAMP)`,
      [firmId],
    );
    await migrator.query(
      `UPDATE app.firm_offerings SET taxpayer_condition = 'SPECIAL_TAXPAYER' WHERE firm_id = $1 AND key = 'iva-spe'`,
      [firmId],
    );
    userId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ('Admin Empresas', $1, true, CURRENT_TIMESTAMP) RETURNING id`,
        [`admin-companies-${suffix}@example.test`],
      )
    ).rows[0].id;
    profileId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.user_profiles (user_id, firm_id, display_name, updated_at) VALUES ($1, $2, 'Admin Empresas', CURRENT_TIMESTAMP) RETURNING id`,
        [userId, firmId],
      )
    ).rows[0].id;
    for (const permission of Object.values(permissions)) {
      await migrator.query(
        `INSERT INTO app.permissions (key, description) VALUES ($1, $1) ON CONFLICT (key) DO NOTHING`,
        [permission],
      );
    }
    roleId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.roles (firm_id, name, slug, is_system, updated_at) VALUES ($1, 'Administrador', $2, true, CURRENT_TIMESTAMP) RETURNING id`,
        [firmId, `administrador-companies-${suffix}`],
      )
    ).rows[0].id;
    await migrator.query(
      `INSERT INTO app.role_permissions (role_id, permission_key) SELECT $1, unnest($2::text[])`,
      [roleId, Object.values(permissions)],
    );
    await migrator.query(
      `INSERT INTO app.role_assignments (firm_id, user_id, role_id, scope) VALUES ($1, $2, $3, 'FIRM')`,
      [firmId, userId, roleId],
    );
    auth = {
      userId,
      firmId,
      activeCompanyId: null,
      allowedCompanyIds: [],
      permissionKeys: Object.values(permissions),
      firmScope: true,
    };
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM audit.audit_events WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query(
      "DELETE FROM app.role_assignments WHERE firm_id = $1",
      [firmId],
    );
    await migrator.query("DELETE FROM app.user_profiles WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query(
      "DELETE FROM app.role_permissions WHERE role_id = $1",
      [roleId],
    );
    await migrator.query("DELETE FROM app.roles WHERE firm_id = $1", [firmId]);
    await migrator.query(
      "DELETE FROM app.branches WHERE company_id IN (SELECT id FROM app.companies WHERE firm_id = $1)",
      [firmId],
    );
    await migrator.query("DELETE FROM app.companies WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query("DELETE FROM app.firm_offerings WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query("DELETE FROM auth.users WHERE id = $1", [userId]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
  });

  it("creates, activates, updates and archives one complete company record", async () => {
    const created = await createCompany(auth, {
      legalName: `Comercial ${suffix}, C.A.`,
      tradeName: "Comercial Test",
      rif: `J-${suffix}-1`,
      activity: "Comercio",
      taxpayerType: "Ordinario",
      fiscalAddress: "Caracas, Distrito Capital",
      contactName: "Contacto Test",
      contactEmail: `contacto-${suffix}@example.test`,
      contactPhone: "0414-0000000",
      responsibleProfileId: profileId,
      servicePlan: "Integral",
      ivssEmployerNumber: "IVSS-123",
      faovPayrollNumber: "FAOV-456",
      incorporationDate: "2024-01-15",
      commercialRegistry: "Registro Mercantil Primero",
      registryFolio: "12",
      registryDocument: "Tomo 3-A",
      shareCapital: "Bs. 100.000",
      incesRncp: "RNCP-789",
      legalRepresentativeName: "Representante Test",
      legalRepresentativeDocument: "V-12345678",
      legalRepresentativePhone: "0412-0000000",
      legalRepresentativeEmail: `representante-${suffix}@example.test`,
      clientPortalEnabled: true,
      restrictedTaxAccessEnabled: true,
      branches: [
        { name: "Sucursal Centro", code: "CENTRO", address: "Caracas, Centro" },
      ],
      officers: [
        {
          position: "Presidente",
          fullName: "Persona Test",
          termStartsAt: "2024-01-15",
          termEndsAt: "2028-01-15",
        },
      ],
      taxOfferingKeys: ["iva", "municipal", "inces"],
      serviceOfferingKeys: ["agua"],
      municipalActivities: [
        {
          branchName: "Sucursal Centro",
          jurisdiction: "Municipio Test",
          economicActivity: "Comercio",
          rate: "0,80",
          effectiveFrom: "2026-01-01",
          source: "Ordenanza municipal validada",
        },
      ],
    });
    companyId = created.id;
    auth = {
      ...auth,
      activeCompanyId: companyId,
      allowedCompanyIds: [companyId],
    };
    expect(created).toMatchObject({
      responsibleProfileId: profileId,
      branchesCount: 1,
      servicePlan: "Integral",
      clientPortalEnabled: true,
    });
    expect(created.municipalActivities[0]).toMatchObject({
      rate: "0,8",
      source: "Ordenanza municipal validada",
    });

    const profile = await migrator.query<{ active_company_id: string | null }>(
      `SELECT active_company_id FROM app.user_profiles WHERE id = $1`,
      [profileId],
    );
    expect(profile.rows[0].active_company_id).toBe(companyId);

    const directory = await getCompanyDirectory(auth);
    expect(directory.activeCompanyId).toBe(companyId);
    expect(directory.companies).toHaveLength(1);
    expect(
      directory.offerings.find(({ id }) => id === "iva-spe")?.taxpayerCondition,
    ).toBe("SPECIAL_TAXPAYER");

    await setActiveCompany(auth, { companyId: null });
    expect(
      (
        await migrator.query<{ active_company_id: string | null }>(
          `SELECT active_company_id FROM app.user_profiles WHERE id = $1`,
          [profileId],
        )
      ).rows[0].active_company_id,
    ).toBeNull();

    await expect(
      updateCompany(auth, companyId, {
        ...created,
        version: created.version,
        taxOfferingKeys: [...created.taxOfferingKeys, "iva-spe"],
      }),
    ).rejects.toThrow("no aplica al tipo de contribuyente");

    const updated = await updateCompany(auth, companyId, {
      ...created,
      version: created.version,
      tradeName: "Comercial Actualizada",
    });
    expect(updated).toMatchObject({
      tradeName: "Comercial Actualizada",
      version: created.version + 1,
    });
    await expect(
      updateCompany(auth, companyId, { ...created, version: created.version }),
    ).rejects.toThrow("otra sesión");

    const specialUpdated = await updateCompany(auth, companyId, {
      ...updated,
      version: updated.version,
      taxpayerType: "Sujeto pasivo especial",
      taxOfferingKeys: [...updated.taxOfferingKeys, "iva-spe"],
    });
    expect(specialUpdated.taxOfferingKeys).toContain("iva-spe");

    await archiveCompany(auth, companyId, {
      version: specialUpdated.version,
      confirmation: "ELIMINAR",
    });
    expect((await getCompanyDirectory(auth)).companies).toHaveLength(0);
    const audit = await migrator.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM audit.audit_events WHERE firm_id = $1 AND entity_type IN ('company', 'user_profile')`,
      [firmId],
    );
    expect(Number(audit.rows[0].count)).toBeGreaterThanOrEqual(4);
  });
});
