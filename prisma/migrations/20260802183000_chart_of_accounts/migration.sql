CREATE TYPE "app"."ChartAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COST', 'EXPENSE', 'MEMORANDUM');
CREATE TYPE "app"."ChartAccountNature" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "app"."ChartAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "app"."firm_chart_templates" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "source_name" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "firm_chart_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "firm_chart_templates_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "firm_chart_templates_firm_id_key" ON "app"."firm_chart_templates"("firm_id");

CREATE TABLE "app"."firm_chart_template_accounts" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "template_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "app"."ChartAccountType" NOT NULL,
  "nature" "app"."ChartAccountNature" NOT NULL,
  "level" INTEGER NOT NULL,
  "parent" TEXT NOT NULL,
  "use" TEXT NOT NULL,
  "accepts_movements" BOOLEAN NOT NULL DEFAULT true,
  "status" "app"."ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "firm_chart_template_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "firm_chart_template_accounts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "app"."firm_chart_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "firm_chart_template_accounts_level_check" CHECK ("level" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "firm_chart_template_accounts_template_id_code_key" ON "app"."firm_chart_template_accounts"("template_id", "code");
CREATE INDEX "firm_chart_template_accounts_template_id_level_code_idx" ON "app"."firm_chart_template_accounts"("template_id", "level", "code");

CREATE TABLE "app"."company_chart_accounts" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "source_template_account_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "app"."ChartAccountType" NOT NULL,
  "nature" "app"."ChartAccountNature" NOT NULL,
  "level" INTEGER NOT NULL,
  "parent" TEXT NOT NULL,
  "use" TEXT NOT NULL,
  "accepts_movements" BOOLEAN NOT NULL DEFAULT true,
  "status" "app"."ChartAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "company_chart_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_chart_accounts_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "company_chart_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "company_chart_accounts_source_template_account_id_fkey" FOREIGN KEY ("source_template_account_id") REFERENCES "app"."firm_chart_template_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "company_chart_accounts_level_check" CHECK ("level" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "company_chart_accounts_company_id_code_key" ON "app"."company_chart_accounts"("company_id", "code");
CREATE INDEX "company_chart_accounts_firm_id_company_id_level_code_idx" ON "app"."company_chart_accounts"("firm_id", "company_id", "level", "code");
CREATE INDEX "company_chart_accounts_source_template_account_id_idx" ON "app"."company_chart_accounts"("source_template_account_id");

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "app"."firm_chart_templates",
  "app"."firm_chart_template_accounts",
  "app"."company_chart_accounts"
TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."firm_chart_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_chart_templates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_chart_templates_read_policy" ON "app"."firm_chart_templates" FOR SELECT
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "firm_chart_templates_manage_policy" ON "app"."firm_chart_templates" FOR ALL
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));

ALTER TABLE "app"."firm_chart_template_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_chart_template_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_chart_template_accounts_read_policy" ON "app"."firm_chart_template_accounts" FOR SELECT
  USING (EXISTS (SELECT 1 FROM "app"."firm_chart_templates" t WHERE t."id" = "template_id" AND t."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
CREATE POLICY "firm_chart_template_accounts_manage_policy" ON "app"."firm_chart_template_accounts" FOR ALL
  USING (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."firm_chart_templates" t WHERE t."id" = "template_id" AND t."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid))
  WITH CHECK (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."firm_chart_templates" t WHERE t."id" = "template_id" AND t."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));

ALTER TABLE "app"."company_chart_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."company_chart_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "company_chart_accounts_scope_policy" ON "app"."company_chart_accounts" FOR ALL
  USING (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND (
      COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
      OR "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
    )
  )
  WITH CHECK (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND (
      COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
      OR "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
    )
  );

INSERT INTO "app"."permissions" ("key", "description") VALUES
  ('chart_accounts.read', 'Consultar el plan de cuentas de las empresas autorizadas'),
  ('chart_accounts.manage', 'Crear y modificar cuentas de las empresas autorizadas'),
  ('firm.chart_template.manage', 'Modificar el plan de cuentas base de la firma')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT r."id", p."permission_key"
FROM "app"."roles" r
CROSS JOIN (VALUES
  ('administrador', 'chart_accounts.read'),
  ('administrador', 'chart_accounts.manage'),
  ('administrador', 'firm.chart_template.manage'),
  ('supervisor', 'chart_accounts.read'),
  ('supervisor', 'chart_accounts.manage'),
  ('colaborador', 'chart_accounts.read')
) AS p("role_slug", "permission_key")
WHERE r."slug" = p."role_slug" AND r."archived_at" IS NULL
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
