import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const client = new Client({ connectionString: process.env.DATABASE_URL });
const migrator = new Client({ connectionString: process.env.DIRECT_DATABASE_URL });

describe("PostgreSQL foundation", () => {
  beforeAll(async () => {
    await client.connect();
    await migrator.connect();
  });

  afterAll(async () => {
    await client.end();
    await migrator.end();
  });

  it("uses the restricted runtime role without BYPASSRLS", async () => {
    const result = await client.query<{
      current_user: string;
      rolbypassrls: boolean;
      rolsuper: boolean;
    }>(
      `SELECT current_user, rolbypassrls, rolsuper
       FROM pg_roles
       WHERE rolname = current_user`,
    );

    expect(result.rows[0]).toEqual({
      current_user: "proyectoxyz_app",
      rolbypassrls: false,
      rolsuper: false,
    });
  });

  it("contains the Prisma-managed schemas and pg_trgm", async () => {
    const schemas = await client.query<{ schema_name: string }>(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name IN ('app', 'audit', 'auth')
       ORDER BY schema_name`,
    );
    const extension = await client.query<{ extname: string }>(
      "SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'",
    );

    expect(schemas.rows.map((row) => row.schema_name)).toEqual([
      "app",
      "audit",
      "auth",
    ]);
    expect(extension.rows).toHaveLength(1);
  });

  it("creates UUIDv7 values and Better Auth tables", async () => {
    const uuid = await client.query<{ version: number }>(
      "SELECT uuid_extract_version(uuidv7()) AS version",
    );
    const tables = await client.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'auth'
       ORDER BY table_name`,
    );

    expect(uuid.rows[0]?.version).toBe(7);
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      "accounts",
      "sessions",
      "two_factors",
      "users",
      "verifications",
    ]);
  });

  it("enforces company isolation through transaction-local RLS context", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const firstFirm = await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma RLS A ${suffix}`],
    );
    const secondFirm = await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, updated_at)
       VALUES ($1, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma RLS B ${suffix}`],
    );
    const firstCompany = await migrator.query<{ id: string }>(
      `INSERT INTO app.companies
         (firm_id, legal_name, rif, normalized_rif, updated_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP) RETURNING id`,
      [firstFirm.rows[0].id, `Empresa RLS A ${suffix}`, `J${suffix}1`],
    );
    const hiddenCompany = await migrator.query<{ id: string }>(
      `INSERT INTO app.companies
         (firm_id, legal_name, rif, normalized_rif, updated_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP) RETURNING id`,
      [firstFirm.rows[0].id, `Empresa RLS oculta ${suffix}`, `J${suffix}2`],
    );
    const otherFirmCompany = await migrator.query<{ id: string }>(
      `INSERT INTO app.companies
         (firm_id, legal_name, rif, normalized_rif, updated_at)
       VALUES ($1, $2, $3, $3, CURRENT_TIMESTAMP) RETURNING id`,
      [secondFirm.rows[0].id, `Empresa RLS B ${suffix}`, `J${suffix}3`],
    );

    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.firm_id', $1, true)", [firstFirm.rows[0].id]);
      await client.query("SELECT set_config('app.firm_scope', 'false', true)");
      await client.query("SELECT set_config('app.allowed_company_ids', $1, true)", [firstCompany.rows[0].id]);
      const scoped = await client.query<{ id: string }>("SELECT id FROM app.companies ORDER BY id");
      await client.query("ROLLBACK");

      expect(scoped.rows.map(({ id }) => id)).toEqual([firstCompany.rows[0].id]);

      await client.query("BEGIN");
      await client.query("SELECT set_config('app.firm_id', $1, true)", [firstFirm.rows[0].id]);
      await client.query("SELECT set_config('app.firm_scope', 'true', true)");
      await client.query("SELECT set_config('app.allowed_company_ids', '', true)");
      const firmWide = await client.query<{ id: string }>("SELECT id FROM app.companies ORDER BY id");
      await client.query("ROLLBACK");

      expect(firmWide.rows.map(({ id }) => id).sort()).toEqual(
        [firstCompany.rows[0].id, hiddenCompany.rows[0].id].sort(),
      );
      expect(firmWide.rows.map(({ id }) => id)).not.toContain(otherFirmCompany.rows[0].id);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      await migrator.query("DELETE FROM app.companies WHERE id = ANY($1::uuid[])", [[firstCompany.rows[0].id, hiddenCompany.rows[0].id, otherFirmCompany.rows[0].id]]);
      await migrator.query("DELETE FROM app.firms WHERE id = ANY($1::uuid[])", [[firstFirm.rows[0].id, secondFirm.rows[0].id]]);
    }
  });

  it("isolates SMTP settings by firm and keeps notifications disabled before verification", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const firstFirm = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, updated_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma correo A ${suffix}`],
    )).rows[0].id;
    const secondFirm = (await migrator.query<{ id: string }>(
      `INSERT INTO app.firms (legal_name, updated_at) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id`,
      [`Firma correo B ${suffix}`],
    )).rows[0].id;

    try {
      await migrator.query(
        `INSERT INTO app.firm_mail_settings (firm_id, smtp_host, updated_at)
         VALUES ($1, 'smtp-a.example.test', CURRENT_TIMESTAMP), ($2, 'smtp-b.example.test', CURRENT_TIMESTAMP)`,
        [firstFirm, secondFirm],
      );

      await client.query("BEGIN");
      await client.query("SELECT set_config('app.firm_id', $1, true)", [firstFirm]);
      await client.query("SELECT set_config('app.firm_scope', 'true', true)");
      const visible = await client.query<{ firm_id: string; enabled: boolean }>(
        "SELECT firm_id, enabled FROM app.firm_mail_settings",
      );
      await client.query("ROLLBACK");

      expect(visible.rows).toEqual([{ firm_id: firstFirm, enabled: false }]);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      await migrator.query("DELETE FROM app.firm_mail_settings WHERE firm_id = ANY($1::uuid[])", [[firstFirm, secondFirm]]);
      await migrator.query("DELETE FROM app.firms WHERE id = ANY($1::uuid[])", [[firstFirm, secondFirm]]);
    }
  });
});
