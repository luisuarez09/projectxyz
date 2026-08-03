CREATE TYPE "app"."CommercialPartyKind" AS ENUM ('CUSTOMER', 'SUPPLIER');
CREATE TYPE "app"."CommercialPartyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "app"."CommercialDocumentType" AS ENUM ('SALE', 'PURCHASE');
CREATE TYPE "app"."CommercialDocumentStatus" AS ENUM ('REGISTERED', 'VOIDED');

CREATE TABLE "app"."commercial_counterparties" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "legal_name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "rif" TEXT NOT NULL,
  "normalized_rif" TEXT NOT NULL,
  "fiscal_address" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "status" "app"."CommercialPartyStatus" NOT NULL DEFAULT 'ACTIVE',
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "commercial_counterparties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_counterparties_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_counterparties_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_counterparties_company_id_normalized_rif_key" ON "app"."commercial_counterparties"("company_id", "normalized_rif");
CREATE INDEX "commercial_counterparties_firm_id_company_id_status_idx" ON "app"."commercial_counterparties"("firm_id", "company_id", "status");
CREATE INDEX "commercial_counterparties_company_id_normalized_name_idx" ON "app"."commercial_counterparties"("company_id", "normalized_name");
CREATE INDEX "commercial_counterparties_search_trgm_idx" ON "app"."commercial_counterparties" USING GIN (("legal_name" || ' ' || "rif") gin_trgm_ops);

CREATE TABLE "app"."commercial_party_roles" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "counterparty_id" UUID NOT NULL,
  "kind" "app"."CommercialPartyKind" NOT NULL,
  "primary_account_id" UUID,
  "counterpart_account_id" UUID,
  "status" "app"."CommercialPartyStatus" NOT NULL DEFAULT 'ACTIVE',
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "commercial_party_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_party_roles_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_party_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_party_roles_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "app"."commercial_counterparties"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_party_roles_primary_account_id_fkey" FOREIGN KEY ("primary_account_id") REFERENCES "app"."company_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_party_roles_counterpart_account_id_fkey" FOREIGN KEY ("counterpart_account_id") REFERENCES "app"."company_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_party_roles_counterparty_id_kind_key" ON "app"."commercial_party_roles"("counterparty_id", "kind");
CREATE INDEX "commercial_party_roles_firm_id_company_id_kind_status_idx" ON "app"."commercial_party_roles"("firm_id", "company_id", "kind", "status");
CREATE INDEX "commercial_party_roles_primary_account_id_idx" ON "app"."commercial_party_roles"("primary_account_id");
CREATE INDEX "commercial_party_roles_counterpart_account_id_idx" ON "app"."commercial_party_roles"("counterpart_account_id");

CREATE TABLE "app"."commercial_documents" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "counterparty_id" UUID NOT NULL,
  "type" "app"."CommercialDocumentType" NOT NULL,
  "document_number" TEXT NOT NULL,
  "issue_date" DATE NOT NULL,
  "currency_code" VARCHAR(3) NOT NULL,
  "taxable_base" DECIMAL(20,6) NOT NULL,
  "exempt_amount" DECIMAL(20,6) NOT NULL,
  "tax_amount" DECIMAL(20,6) NOT NULL,
  "total_amount" DECIMAL(20,6) NOT NULL,
  "status" "app"."CommercialDocumentStatus" NOT NULL DEFAULT 'REGISTERED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "commercial_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_documents_nonnegative_amounts" CHECK ("taxable_base" >= 0 AND "exempt_amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" >= 0),
  CONSTRAINT "commercial_documents_total_check" CHECK ("total_amount" = "taxable_base" + "exempt_amount" + "tax_amount"),
  CONSTRAINT "commercial_documents_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "commercial_documents_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "app"."commercial_counterparties"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_documents_company_id_type_counterparty_id_document_number_key" ON "app"."commercial_documents"("company_id", "type", "counterparty_id", "document_number");
CREATE INDEX "commercial_documents_firm_id_company_id_type_issue_date_idx" ON "app"."commercial_documents"("firm_id", "company_id", "type", "issue_date");
CREATE INDEX "commercial_documents_counterparty_id_issue_date_idx" ON "app"."commercial_documents"("counterparty_id", "issue_date");

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "app"."commercial_counterparties",
  "app"."commercial_party_roles",
  "app"."commercial_documents"
TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."commercial_counterparties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."commercial_counterparties" FORCE ROW LEVEL SECURITY;
CREATE POLICY "commercial_counterparties_scope_policy" ON "app"."commercial_counterparties" FOR ALL
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

ALTER TABLE "app"."commercial_party_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."commercial_party_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "commercial_party_roles_scope_policy" ON "app"."commercial_party_roles" FOR ALL
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

ALTER TABLE "app"."commercial_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."commercial_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "commercial_documents_scope_policy" ON "app"."commercial_documents" FOR ALL
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
  ('counterparties.read', 'Consultar clientes y proveedores comerciales de las empresas autorizadas'),
  ('counterparties.manage', 'Crear y modificar clientes y proveedores comerciales'),
  ('commercial_documents.manage', 'Registrar documentos comerciales de compras y ventas')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT r."id", p."permission_key"
FROM "app"."roles" r
CROSS JOIN (VALUES
  ('administrador', 'counterparties.read'),
  ('administrador', 'counterparties.manage'),
  ('administrador', 'commercial_documents.manage'),
  ('supervisor', 'counterparties.read'),
  ('supervisor', 'counterparties.manage'),
  ('supervisor', 'commercial_documents.manage'),
  ('colaborador', 'counterparties.read'),
  ('colaborador', 'counterparties.manage'),
  ('colaborador', 'commercial_documents.manage')
) AS p("role_slug", "permission_key")
WHERE r."slug" = p."role_slug" AND r."archived_at" IS NULL
ON CONFLICT ("role_id", "permission_key") DO NOTHING;
