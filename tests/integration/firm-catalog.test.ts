import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createFirmOffering,
  createFiscalCalendarMatrix,
  getFirmCatalog,
  saveFiscalCalendarMatrix,
  saveTaxRates,
  updateFirmOffering,
  updateFiscalCalendarMatrix,
} from "@/modules/firm/application/catalog";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const migrator = new Client({
  connectionString: process.env.DIRECT_DATABASE_URL,
});

describe("firm services and tax catalog backend", () => {
  const suffix = randomUUID().slice(0, 8);
  let firmId = "";
  let userId = "";
  let calendarId = "";
  let matrixId = "";
  let auth: AuthContext;

  beforeAll(async () => {
    await migrator.connect();
    firmId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.firms (legal_name, rif, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id`,
        [`Firma Catálogo ${suffix}`, `C-${suffix}`],
      )
    ).rows[0].id;
    userId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ('Admin Catálogo', $1, true, CURRENT_TIMESTAMP) RETURNING id`,
        [`catalog-${suffix}@example.test`],
      )
    ).rows[0].id;
    auth = {
      userId,
      firmId,
      activeCompanyId: null,
      allowedCompanyIds: [],
      permissionKeys: [
        permissions.firmSettingsRead,
        permissions.firmSettingsUpdate,
      ],
      firmScope: true,
    };
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM audit.audit_events WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query(
      "DELETE FROM app.fiscal_calendars WHERE firm_id = $1",
      [firmId],
    );
    await migrator.query("DELETE FROM app.tax_rates WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query("DELETE FROM app.firm_offerings WHERE firm_id = $1", [
      firmId,
    ]);
    await migrator.query("DELETE FROM auth.users WHERE id = $1", [userId]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
  });

  it("persists services, taxes, rates and SPE dates with traceability", async () => {
    const service = await createFirmOffering(auth, {
      kind: "SERVICE",
      name: "Internet",
      organism: "Prestador",
      frequency: "Según factura",
      speFrequency: "No aplica",
      speCalendarGroup: "",
      deadline: {
        mode: "document-date",
        dayCount: 0,
        dayType: "calendar",
        base: "document-date",
      },
      template: "none",
      source: "",
      appliesFrom: "",
      appliesTo: "",
      active: true,
    });
    const updatedService = await updateFirmOffering(auth, service.id, {
      ...service,
      version: service.version,
      organism: "Prestador actualizado",
    });
    expect(updatedService).toMatchObject({
      active: true,
      organism: "Prestador actualizado",
      version: 2,
    });

    const tax = await createFirmOffering(auth, {
      kind: "TAX",
      name: "IVA prueba",
      organism: "SENIAT",
      frequency: "Mensual",
      speFrequency: "No aplica",
      speCalendarGroup: "",
      deadline: {
        mode: "days",
        dayCount: 15,
        dayType: "business",
        base: "period-start",
      },
      evidenceRequirements: [
        { kind: "DECLARATION_RECEIPT", required: true },
        { kind: "DECLARATION_FILE", required: true },
      ],
      template: "iva",
      source: "Fuente de prueba",
      appliesFrom: "2026-01-01",
      appliesTo: "",
      active: true,
    });
    const rates = await saveTaxRates(auth, {
      rates: [
        {
          id: "",
          offeringId: tax.id,
          name: "General prueba",
          rate: "16",
          appliesFrom: "2026-01-01",
          appliesTo: "",
          source: "Fuente de prueba",
          active: true,
        },
      ],
    });
    expect(rates.taxRates).toHaveLength(1);

    calendarId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.fiscal_calendars (firm_id, key, name, year, taxpayer_condition, effective_from, effective_to, updated_at) VALUES ($1, 'spe-test', 'SPE prueba', 2026, 'SPECIAL_TAXPAYER', '2026-01-01', '2026-12-31', CURRENT_TIMESTAMP) RETURNING id`,
        [firmId],
      )
    ).rows[0].id;
    matrixId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.fiscal_calendar_matrices (calendar_id, key, group_key, label, short_label, cadence, period_label, updated_at) VALUES ($1, 'matrix-test', 'group-test', 'Matriz prueba', 'Prueba', 'Mensual', '2026', CURRENT_TIMESTAMP) RETURNING id`,
        [calendarId],
      )
    ).rows[0].id;
    const calendar = await saveFiscalCalendarMatrix(
      auth,
      calendarId,
      matrixId,
      { version: 1, rows: [{ rif: "0 y 8", dates: { ENE: "15", FEB: "09" } }] },
    );
    expect(calendar.version).toBe(2);
    expect(calendar.matrices[0].rows.map(({ rif }) => rif)).toEqual(["0", "8"]);
    expect(calendar.matrices[0].rows[0].dates).toEqual({
      ENE: "15",
      FEB: "09",
    });

    const configured = await updateFiscalCalendarMatrix(
      auth,
      calendarId,
      matrixId,
      {
        version: calendar.version,
        label: "Matriz actualizada",
        shortLabel: "Actualizada",
        cadence: "Quincenal",
        period: "Períodos 2026",
        note: "Configuración de prueba",
        offeringIds: [tax.id],
      },
    );
    expect(configured.matrices[0]).toMatchObject({
      label: "Matriz actualizada",
      offeringIds: [tax.id],
      obligations: ["IVA prueba"],
    });

    const createdMatrix = await createFiscalCalendarMatrix(auth, calendarId, {
      version: configured.version,
      label: "Nueva matriz mensual",
      shortLabel: "Nueva mensual",
      cadence: "Mensual",
      period: "Períodos 2026",
      note: "",
      offeringIds: [tax.id],
    });
    const newMatrix = createdMatrix.calendar.matrices.find(
      ({ id }) => id === createdMatrix.matrixId,
    );
    expect(newMatrix?.columns).toEqual([
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEP",
      "OCT",
      "NOV",
      "DIC",
    ]);
    expect(newMatrix?.rows.map(({ rif }) => rif)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);

    const catalog = await getFirmCatalog(auth);
    expect(catalog.offerings).toHaveLength(2);
    expect(catalog.taxRates[0]).toMatchObject({
      name: "General prueba",
      active: true,
    });
    expect(catalog.calendars[0]).toMatchObject({
      taxpayerCondition: "SPECIAL_TAXPAYER",
    });
  });
});
