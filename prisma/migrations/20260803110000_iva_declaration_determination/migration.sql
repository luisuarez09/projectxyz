CREATE TYPE "app"."IvaDeclarationDocumentKind" AS ENUM ('SALE', 'PURCHASE');

CREATE TABLE "app"."iva_declarations" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "period_key" VARCHAR(7) NOT NULL,
  "previous_fiscal_credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "previous_retention_credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "sales_taxable_base" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "sales_exempt_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "debit_tax" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "purchase_tax_credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "deductible_tax_credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "current_retention_credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "proration_factor" DECIMAL(12,8),
  "tax_payable" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "fiscal_credit_carryforward" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "retention_credit_carryforward" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "determined_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "iva_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iva_declarations_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "iva_declarations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "iva_declarations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "app"."compliance_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "iva_declarations_case_id_key" ON "app"."iva_declarations"("case_id");
CREATE UNIQUE INDEX "iva_declarations_company_id_period_key_key" ON "app"."iva_declarations"("company_id", "period_key");
CREATE INDEX "iva_declarations_firm_id_company_id_period_key_idx" ON "app"."iva_declarations"("firm_id", "company_id", "period_key");

CREATE TABLE "app"."iva_declaration_documents" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "declaration_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "kind" "app"."IvaDeclarationDocumentKind" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "iva_declaration_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iva_declaration_documents_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "app"."iva_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "iva_declaration_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."commercial_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "iva_declaration_documents_document_id_key" ON "app"."iva_declaration_documents"("document_id");
CREATE INDEX "iva_declaration_documents_firm_id_company_id_declaration_id_idx" ON "app"."iva_declaration_documents"("firm_id", "company_id", "declaration_id");

CREATE TABLE "app"."iva_declaration_retentions" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "declaration_id" UUID NOT NULL,
  "retention_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "iva_declaration_retentions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iva_declaration_retentions_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "app"."iva_declarations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "iva_declaration_retentions_retention_id_fkey" FOREIGN KEY ("retention_id") REFERENCES "app"."commercial_retentions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "iva_declaration_retentions_retention_id_key" ON "app"."iva_declaration_retentions"("retention_id");
CREATE INDEX "iva_declaration_retentions_firm_id_company_id_declaration_id_idx" ON "app"."iva_declaration_retentions"("firm_id", "company_id", "declaration_id");

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "app"."iva_declarations",
  "app"."iva_declaration_documents",
  "app"."iva_declaration_retentions"
TO proyectoxyz_app, proyectoxyz_worker;

DO $policies$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['iva_declarations', 'iva_declaration_documents', 'iva_declaration_retentions']
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON app.%I FOR ALL USING (firm_id = NULLIF(current_setting(''app.firm_id'', true), '''')::uuid AND (COALESCE(NULLIF(current_setting(''app.firm_scope'', true), '''')::boolean, false) OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting(''app.allowed_company_ids'', true), ''''), '','')::uuid[], ARRAY[]::uuid[])))) WITH CHECK (firm_id = NULLIF(current_setting(''app.firm_id'', true), '''')::uuid AND (COALESCE(NULLIF(current_setting(''app.firm_scope'', true), '''')::boolean, false) OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting(''app.allowed_company_ids'', true), ''''), '','')::uuid[], ARRAY[]::uuid[]))))',
      table_name || '_scope_policy', table_name
    );
  END LOOP;
END $policies$;
