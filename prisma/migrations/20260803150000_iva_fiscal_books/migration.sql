CREATE TYPE "app"."IvaFiscalBookKind" AS ENUM ('SALES', 'PURCHASES');

CREATE TABLE "app"."iva_fiscal_books" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "declaration_id" UUID NOT NULL,
  "period_key" VARCHAR(7) NOT NULL,
  "kind" "app"."IvaFiscalBookKind" NOT NULL,
  "snapshot" JSONB NOT NULL,
  "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "iva_fiscal_books_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iva_fiscal_books_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "iva_fiscal_books_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "iva_fiscal_books_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "app"."iva_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "iva_fiscal_books_declaration_id_kind_key"
ON "app"."iva_fiscal_books"("declaration_id", "kind");

CREATE INDEX "iva_fiscal_books_firm_id_company_id_period_key_idx"
ON "app"."iva_fiscal_books"("firm_id", "company_id", "period_key");

GRANT SELECT, INSERT, UPDATE, DELETE ON "app"."iva_fiscal_books"
TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."iva_fiscal_books" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."iva_fiscal_books" FORCE ROW LEVEL SECURITY;

CREATE POLICY "iva_fiscal_books_scope_policy"
ON "app"."iva_fiscal_books"
FOR ALL
USING (
  firm_id = NULLIF(current_setting('app.firm_id', true), '')::uuid
  AND (
    COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
    OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
  )
)
WITH CHECK (
  firm_id = NULLIF(current_setting('app.firm_id', true), '')::uuid
  AND (
    COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
    OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
  )
);
