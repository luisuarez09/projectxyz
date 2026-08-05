import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  archiveCommercialParty,
  createCommercialDocument,
  createCommercialParty,
  getCommercialDocumentFormOptions,
  getCommercialPartyProfile,
  listCommercialParties,
  updateCommercialParty,
} from "@/modules/commercial/application/commercial";
import { permissions } from "@/modules/identity/domain/permissions";
import type { AuthContext } from "@/modules/shared/application/context";

const migrator = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });

describe("commercial counterparties backend", () => {
  const suffix = randomUUID().slice(0, 8);
  let firmId = "";
  let companyId = "";
  let userId = "";
  let accounts: Record<string, string> = {};
  let auth: AuthContext;

  beforeAll(async () => {
    await migrator.connect();
    firmId = (
      await migrator.query<{ id: string }>(
        "INSERT INTO app.firms (legal_name, rif, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING id",
        [`Firma Comercial ${suffix}`, `F-${suffix}`],
      )
    ).rows[0].id;
    userId = (
      await migrator.query<{ id: string }>(
        "INSERT INTO auth.users (name, email, email_verified, updated_at) VALUES ('Operador Comercial', $1, true, CURRENT_TIMESTAMP) RETURNING id",
        [`commercial-${suffix}@example.test`],
      )
    ).rows[0].id;
    companyId = (
      await migrator.query<{ id: string }>(
        `INSERT INTO app.companies (firm_id, legal_name, rif, normalized_rif, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id`,
        [firmId, `Empresa ${suffix}`, `J-${suffix}`, `J${suffix}`.toUpperCase()],
      )
    ).rows[0].id;
    const accountRows = await migrator.query<{ id: string; code: string }>(
      `INSERT INTO app.company_chart_accounts
        (firm_id, company_id, code, name, type, nature, level, parent, use, accepts_movements, updated_at)
       SELECT $1, $2, code, name, type::app."ChartAccountType", nature::app."ChartAccountNature", 5, 'Prueba', 'Integración', true, CURRENT_TIMESTAMP
       FROM (VALUES
         ('1.1.01', 'Cuentas por cobrar', 'ASSET', 'DEBIT'),
         ('1.1.02', 'IVA crédito fiscal', 'ASSET', 'DEBIT'),
         ('2.1.01', 'Cuentas por pagar', 'LIABILITY', 'CREDIT'),
         ('2.1.02', 'IVA débito fiscal', 'LIABILITY', 'CREDIT'),
         ('4.1.01', 'Ingresos', 'INCOME', 'CREDIT'),
         ('5.1.01', 'Compras', 'EXPENSE', 'DEBIT')
       ) AS data(code, name, type, nature)
       RETURNING id, code`,
      [firmId, companyId],
    );
    accounts = Object.fromEntries(accountRows.rows.map((row) => [row.code, row.id]));
    const offeringId = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firm_offerings
        (firm_id, key, kind, name, organism, frequency, deadline_mode, deadline_day_type, deadline_base, active, source, updated_at)
       VALUES ($1, 'iva', 'TAX', 'IVA', 'SENIAT', 'Mensual', 'FIXED_DATE', 'CALENDAR', 'period-end', true, 'Fuente de prueba', CURRENT_TIMESTAMP)
       RETURNING id`, [firmId],
    )).rows[0].id;
    await migrator.query(
      `INSERT INTO app.tax_rates (firm_id, offering_id, name, rate, effective_from, source, active, updated_at)
       VALUES ($1, $2, 'General', 16, DATE '2026-01-01', 'Fuente de prueba', true, CURRENT_TIMESTAMP)`,
      [firmId, offeringId],
    );
    await migrator.query(
      `INSERT INTO app.company_accounting_assignments (firm_id, company_id, role_key, account_id, updated_at)
       VALUES ($1, $2, 'iva-debit', $3, CURRENT_TIMESTAMP), ($1, $2, 'iva-credit', $4, CURRENT_TIMESTAMP)`,
      [firmId, companyId, accounts["2.1.02"], accounts["1.1.02"]],
    );
    auth = {
      userId,
      firmId,
      activeCompanyId: companyId,
      allowedCompanyIds: [companyId],
      permissionKeys: [permissions.counterpartiesRead, permissions.counterpartiesManage, permissions.commercialDocumentsManage],
      firmScope: false,
    };
  });

  afterAll(async () => {
    await migrator.query("DELETE FROM audit.audit_events WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.commercial_documents WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.commercial_party_roles WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.commercial_counterparties WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.company_accounting_assignments WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.company_offerings WHERE company_id = $1", [companyId]);
    await migrator.query("DELETE FROM app.company_commercial_settings WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.company_chart_accounts WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.tax_rates WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.firm_offerings WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM app.companies WHERE firm_id = $1", [firmId]);
    await migrator.query("DELETE FROM auth.users WHERE id = $1", [userId]);
    await migrator.query("DELETE FROM app.firms WHERE id = $1", [firmId]);
    await migrator.end();
  });

  it("persists shared customer/supplier profiles and their invoice movements", async () => {
    await expect(getCommercialDocumentFormOptions(auth, "sale")).resolves.toMatchObject({
      vatEnabled: false,
      vatRates: [],
    });
    await migrator.query(
      `INSERT INTO app.company_offerings (company_id, kind, offering_key)
       VALUES ($1, 'TAX', 'iva')`,
      [companyId],
    );
    await expect(getCommercialDocumentFormOptions(auth, "sale")).resolves.toMatchObject({
      vatEnabled: true,
      vatRates: [{ rate: "16" }],
    });
    const customer = await createCommercialParty(auth, {
      kind: "customer",
      legalName: `Contraparte ${suffix}, C.A.`,
      rif: `J-${suffix}`,
      fiscalAddress: "Caracas",
      email: "",
      phone: "0414-0000000",
      primaryAccountId: accounts["1.1.01"],
      counterpartAccountId: accounts["4.1.01"],
    });
    const supplier = await createCommercialParty(auth, {
      kind: "supplier",
      legalName: `Contraparte ${suffix}, C.A.`,
      rif: `J-${suffix}`,
      fiscalAddress: "Caracas",
      email: "",
      phone: "0414-0000000",
      primaryAccountId: accounts["5.1.01"],
      counterpartAccountId: accounts["2.1.01"],
    });
    expect(supplier.id).toBe(customer.id);
    expect((await listCommercialParties(auth, "customer")).parties).toHaveLength(1);
    expect((await listCommercialParties(auth, "supplier")).parties).toHaveLength(1);

    await createCommercialDocument(auth, {
      type: "sale",
      counterpartyId: customer.id,
      documentNumber: "",
      issueDate: "2026-08-02",
      currencyCode: "VES",
      taxableBase: "100.000000",
      exemptAmount: "0.000000",
      taxAmount: "16.000000",
      totalAmount: "116.000000",
      vatRateId: null,
      items: [{ description: "Servicio", quantity: "1.000000", unitPrice: "100.000000", taxable: true }],
      accountingEntries: [
        { accountId: accounts["1.1.01"], debit: "116.000000", credit: "0.000000", source: "party" },
        { accountId: accounts["4.1.01"], debit: "0.000000", credit: "100.000000", source: "counterpart" },
        { accountId: accounts["2.1.02"], debit: "0.000000", credit: "16.000000", source: "tax" },
      ],
      retentions: [
        { type: "IVA", receiptNumber: "202608000000001", issueDate: "2026-08-02", percentage: "75.000000", amount: "12.000000" },
        { type: "ISLR", receiptNumber: `ISLR-${suffix}`, issueDate: "2026-08-02", percentage: "", amount: "1.000000" },
      ],
    });
    await createCommercialDocument(auth, {
      type: "purchase",
      counterpartyId: supplier.id,
      documentNumber: `C-${suffix}`,
      issueDate: "2026-08-01",
      currencyCode: "USD",
      taxableBase: "10.000000",
      exemptAmount: "5.000000",
      taxAmount: "1.600000",
      totalAmount: "16.600000",
      vatRateId: null,
      accountingEntries: [
        { accountId: accounts["5.1.01"], debit: "15.000000", credit: "0.000000", source: "party" },
        { accountId: accounts["1.1.02"], debit: "1.600000", credit: "0.000000", source: "tax" },
        { accountId: accounts["2.1.01"], debit: "0.000000", credit: "16.600000", source: "counterpart" },
      ],
    });
    await expect(createCommercialDocument(auth, {
      type: "purchase",
      counterpartyId: supplier.id,
      documentNumber: `C-${suffix}`,
      issueDate: "2026-08-01",
      currencyCode: "USD",
      taxableBase: "10.000000",
      exemptAmount: "5.000000",
      taxAmount: "1.600000",
      totalAmount: "16.600000",
      vatRateId: null,
      accountingEntries: [
        { accountId: accounts["5.1.01"], debit: "15.000000", credit: "0.000000", source: "party" },
        { accountId: accounts["1.1.02"], debit: "1.600000", credit: "0.000000", source: "tax" },
        { accountId: accounts["2.1.01"], debit: "0.000000", credit: "16.600000", source: "counterpart" },
      ],
    })).rejects.toThrow("Ya existe una factura");

    const profile = await getCommercialPartyProfile(auth, customer.id, "customer");
    expect(profile.summary).toMatchObject({ documentCount: 1, totalsByCurrency: { VES: "116.00" }, lastIssueDate: "2026-08-02" });
    expect(profile.documents[0]).toMatchObject({ documentNumber: "F-000001", totalAmount: "116", impositionPeriod: "2026-08" });
    expect(profile.documents[0].retentions).toHaveLength(2);

    const updated = await updateCommercialParty(auth, customer.id, {
      kind: "customer",
      legalName: `Contraparte Actualizada ${suffix}, C.A.`,
      rif: `J-${suffix}`,
      fiscalAddress: "Valencia",
      email: "",
      phone: "0414-0000000",
      primaryAccountId: accounts["1.1.01"],
      counterpartAccountId: accounts["4.1.01"],
      version: profile.party.version,
    });
    expect(updated).toMatchObject({ legalName: `Contraparte Actualizada ${suffix}, C.A.`, fiscalAddress: "Valencia" });

    await archiveCommercialParty(auth, customer.id, "customer");
    expect((await listCommercialParties(auth, "customer")).parties).toHaveLength(0);
    expect((await listCommercialParties(auth, "supplier")).parties).toHaveLength(1);
    expect(Number((await migrator.query<{ count: string }>("SELECT count(*)::text AS count FROM app.commercial_documents WHERE counterparty_id = $1", [customer.id])).rows[0].count)).toBe(2);
  });

  it("registers a fully exempt sales document with zero tax and without VAT accounting entry", async () => {
    const customer = await createCommercialParty(auth, {
      kind: "customer",
      legalName: `Cliente Exento ${suffix}, C.A.`,
      rif: `J-E${suffix}`,
      fiscalAddress: "Caracas",
      email: "",
      phone: "0414-0000000",
      primaryAccountId: accounts["1.1.01"],
      counterpartAccountId: accounts["4.1.01"],
    });

    const exemptSale = await createCommercialDocument(auth, {
      type: "sale",
      counterpartyId: customer.id,
      documentNumber: "",
      issueDate: "2026-08-03",
      currencyCode: "VES",
      taxableBase: "0.000000",
      exemptAmount: "250.000000",
      taxAmount: "0.000000",
      totalAmount: "250.000000",
      vatRateId: null,
      items: [
        {
          description: "Servicio Exento",
          quantity: "1.000000",
          unitPrice: "250.000000",
          taxable: false,
        },
      ],
      accountingEntries: [
        {
          accountId: accounts["1.1.01"],
          debit: "250.000000",
          credit: "0.000000",
          source: "party",
        },
        {
          accountId: accounts["4.1.01"],
          debit: "0.000000",
          credit: "250.000000",
          source: "counterpart",
        },
      ],
    });

    expect(exemptSale).toMatchObject({
      type: "sale",
      taxableBase: "0",
      exemptAmount: "250",
      taxAmount: "0",
      totalAmount: "250",
      vatRate: null,
      vatSource: null,
      status: "registered",
    });
  });
});
