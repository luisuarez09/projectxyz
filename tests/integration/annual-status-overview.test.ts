import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getAnnualStatusOverview } from "@/modules/calendar/application/calendar";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const migrator = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });

describe("annual status overview backend", () => {
  const suffix = randomUUID().slice(0, 8);
  let firmId = "";
  let userId = "";
  let companyId = "";
  let taxOfferingId = "";
  let serviceOfferingId = "";
  let removedServiceOfferingId = "";
  let auth: AuthContext;

  beforeAll(async () => {
    await migrator.connect();
    firmId = (await migrator.query<{ id: string }>(
      "INSERT INTO app.firms (legal_name, rif, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id",
      [`Firma Resumen ${suffix}`, `F-${suffix}`],
    )).rows[0].id;
    userId = (await migrator.query<{ id: string }>(
      "INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP) RETURNING id",
      ["Usuario Resumen", `status-${suffix}@example.test`],
    )).rows[0].id;
    companyId = (await migrator.query<{ id: string }>(
      "INSERT INTO app.companies (firm_id, legal_name, rif, normalized_rif, updated_at) VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP) RETURNING id",
      [firmId, `Empresa Activa ${suffix}`, `J-${suffix}`],
    )).rows[0].id;
    taxOfferingId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firm_offerings
        (firm_id, key, kind, name, organism, frequency, deadline_mode, deadline_day_count, deadline_day_type, deadline_base, active, updated_at)
       VALUES ($1, $2, 'TAX', 'IVA de prueba', 'SENIAT', 'Mensual', 'days', 5, 'calendar', 'period-start', true, CURRENT_TIMESTAMP)
       RETURNING id`,
      [firmId, `tax-${suffix}`],
    )).rows[0].id;
    serviceOfferingId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firm_offerings
        (firm_id, key, kind, name, organism, frequency, deadline_mode, deadline_day_count, deadline_day_type, deadline_base, active, updated_at)
       VALUES ($1, $2, 'SERVICE', 'Agua de prueba', 'Prestador', 'Mensual', 'document-date', 0, 'calendar', 'document-date', true, CURRENT_TIMESTAMP)
       RETURNING id`,
      [firmId, `service-${suffix}`],
    )).rows[0].id;
    removedServiceOfferingId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firm_offerings
        (firm_id, key, kind, name, organism, frequency, deadline_mode, deadline_day_count, deadline_day_type, deadline_base, active, updated_at)
       VALUES ($1, $2, 'SERVICE', 'Servicio retirado', 'Prestador', 'Mensual', 'document-date', 0, 'calendar', 'document-date', true, CURRENT_TIMESTAMP)
       RETURNING id`,
      [firmId, `removed-service-${suffix}`],
    )).rows[0].id;
    await migrator.query(
      `INSERT INTO app.company_offerings (company_id, kind, offering_key)
       VALUES ($1, 'TAX', $2), ($1, 'SERVICE', $3), ($1, 'SERVICE', $4)`,
      [companyId, `tax-${suffix}`, `service-${suffix}`, `removed-service-${suffix}`],
    );
    auth = {
      userId,
      firmId,
      activeCompanyId: companyId,
      allowedCompanyIds: [companyId],
      permissionKeys: [permissions.calendarRead],
      firmScope: true,
    };
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM app.compliance_cases WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.company_offerings WHERE company_id = $1", [companyId]);
    await migrator.query("DELETE FROM app.companies WHERE id = $1", [companyId]);
    await migrator.query("DELETE FROM app.firm_offerings WHERE id = ANY($1::uuid[])", [[taxOfferingId, serviceOfferingId, removedServiceOfferingId]]);
    await migrator.query("DELETE FROM auth.users WHERE id = $1", [userId]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
  });

  it("materializes and separates tax and service commitments for the active company", async () => {
    const taxes = await getAnnualStatusOverview(auth, 2026, "TAX");
    await getAnnualStatusOverview(auth, 2026, "SERVICE");
    await migrator.query(
      "DELETE FROM app.company_offerings WHERE company_id = $1 AND kind = 'SERVICE' AND offering_key = $2",
      [companyId, `removed-service-${suffix}`],
    );
    const services = await getAnnualStatusOverview(auth, 2026, "SERVICE");

    expect(taxes.company).toEqual({ id: companyId, legalName: `Empresa Activa ${suffix}` });
    expect(taxes.rows).toHaveLength(1);
    expect(taxes.rows[0]).toMatchObject({ offeringId: taxOfferingId, name: "IVA de prueba" });
    expect(taxes.rows[0].statuses).toHaveLength(12);
    expect(services.rows).toHaveLength(1);
    expect(services.rows[0]).toMatchObject({ offeringId: serviceOfferingId, name: "Agua de prueba" });
    expect(services.rows.some(({ offeringId }) => offeringId === removedServiceOfferingId)).toBe(false);
  });
});
