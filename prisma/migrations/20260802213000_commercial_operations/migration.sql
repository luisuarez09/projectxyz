CREATE TYPE "app"."CommercialVatCreditStatus" AS ENUM ('PENDING', 'APPLIED', 'EXCLUDED');
CREATE TYPE "app"."CommercialRetentionType" AS ENUM ('IVA', 'ISLR');

CREATE TABLE "app"."company_accounting_assignments" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "role_key" TEXT NOT NULL,
  "account_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "company_accounting_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_accounting_assignments_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "company_accounting_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "company_accounting_assignments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "app"."company_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "company_accounting_assignments_company_id_role_key_key" ON "app"."company_accounting_assignments"("company_id", "role_key");
CREATE INDEX "company_accounting_assignments_firm_id_company_id_idx" ON "app"."company_accounting_assignments"("firm_id", "company_id");
CREATE INDEX "company_accounting_assignments_account_id_idx" ON "app"."company_accounting_assignments"("account_id");

CREATE TABLE "app"."company_commercial_settings" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "sales_invoice_prefix" TEXT NOT NULL DEFAULT 'F-',
  "next_sales_invoice_number" INTEGER NOT NULL DEFAULT 1,
  "sales_invoice_padding" INTEGER NOT NULL DEFAULT 6,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "company_commercial_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_commercial_settings_company_id_key" UNIQUE ("company_id"),
  CONSTRAINT "company_commercial_settings_numbers_check" CHECK ("next_sales_invoice_number" > 0 AND "sales_invoice_padding" BETWEEN 1 AND 12),
  CONSTRAINT "company_commercial_settings_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "company_commercial_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "company_commercial_settings_firm_id_company_id_idx" ON "app"."company_commercial_settings"("firm_id", "company_id");

DROP INDEX "app"."commercial_documents_company_id_type_counterparty_id_document_number_key";
ALTER TABLE "app"."commercial_documents" ALTER COLUMN "counterparty_id" DROP NOT NULL;
ALTER TABLE "app"."commercial_documents"
  ADD COLUMN "normalized_document_number" TEXT,
  ADD COLUMN "sequence_number" INTEGER,
  ADD COLUMN "imposition_period" VARCHAR(7),
  ADD COLUMN "vat_rate" DECIMAL(8,4),
  ADD COLUMN "vat_source" TEXT,
  ADD COLUMN "tax_rate_id" UUID,
  ADD COLUMN "vat_credit_status" "app"."CommercialVatCreditStatus",
  ADD COLUMN "invoice_attachment_id" UUID,
  ADD COLUMN "void_reason" TEXT;

UPDATE "app"."commercial_documents"
SET
  "normalized_document_number" = upper(regexp_replace("document_number", '[^[:alnum:]]', '', 'g')),
  "imposition_period" = to_char("issue_date", 'YYYY-MM');

ALTER TABLE "app"."commercial_documents"
  ALTER COLUMN "normalized_document_number" SET NOT NULL,
  ALTER COLUMN "imposition_period" SET NOT NULL,
  ADD CONSTRAINT "commercial_documents_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "app"."tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_invoice_attachment_id_fkey" FOREIGN KEY ("invoice_attachment_id") REFERENCES "app"."stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "commercial_documents_void_check" CHECK (
    ("status" = 'REGISTERED' AND "counterparty_id" IS NOT NULL AND "void_reason" IS NULL)
    OR ("status" = 'VOIDED' AND "type" = 'SALE' AND "counterparty_id" IS NULL AND "void_reason" IS NOT NULL)
  );

CREATE UNIQUE INDEX "commercial_documents_invoice_attachment_id_key" ON "app"."commercial_documents"("invoice_attachment_id");
CREATE UNIQUE INDEX "commercial_documents_sale_number_key" ON "app"."commercial_documents"("company_id", "normalized_document_number") WHERE "type" = 'SALE';
CREATE UNIQUE INDEX "commercial_documents_purchase_party_number_key" ON "app"."commercial_documents"("company_id", "counterparty_id", "normalized_document_number") WHERE "type" = 'PURCHASE';
CREATE INDEX "commercial_documents_tax_rate_id_idx" ON "app"."commercial_documents"("tax_rate_id");

CREATE TABLE "app"."commercial_document_items" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "document_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(20,6) NOT NULL,
  "unit_price" DECIMAL(20,6) NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "line_total" DECIMAL(20,6) NOT NULL,
  CONSTRAINT "commercial_document_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_document_items_positive_check" CHECK ("position" > 0 AND "quantity" > 0 AND "unit_price" >= 0 AND "line_total" >= 0),
  CONSTRAINT "commercial_document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."commercial_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_document_items_document_id_position_key" ON "app"."commercial_document_items"("document_id", "position");

CREATE TABLE "app"."commercial_accounting_entries" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "debit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "credit" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL,
  CONSTRAINT "commercial_accounting_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_accounting_entries_amount_check" CHECK ("position" > 0 AND "debit" >= 0 AND "credit" >= 0 AND (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0))),
  CONSTRAINT "commercial_accounting_entries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."commercial_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commercial_accounting_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "app"."company_chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_accounting_entries_document_id_position_key" ON "app"."commercial_accounting_entries"("document_id", "position");
CREATE INDEX "commercial_accounting_entries_firm_id_company_id_account_id_idx" ON "app"."commercial_accounting_entries"("firm_id", "company_id", "account_id");

CREATE TABLE "app"."commercial_retentions" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "type" "app"."CommercialRetentionType" NOT NULL,
  "receipt_number" TEXT NOT NULL,
  "normalized_receipt_number" TEXT NOT NULL,
  "issue_date" DATE NOT NULL,
  "percentage" DECIMAL(8,4),
  "amount" DECIMAL(20,6) NOT NULL,
  "attachment_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "commercial_retentions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commercial_retentions_amount_check" CHECK ("amount" > 0 AND ("percentage" IS NULL OR ("percentage" > 0 AND "percentage" <= 100))),
  CONSTRAINT "commercial_retentions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."commercial_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "commercial_retentions_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "app"."stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "commercial_retentions_document_id_type_key" ON "app"."commercial_retentions"("document_id", "type");
CREATE UNIQUE INDEX "commercial_retentions_company_id_type_normalized_receipt_number_key" ON "app"."commercial_retentions"("company_id", "type", "normalized_receipt_number");
CREATE UNIQUE INDEX "commercial_retentions_attachment_id_key" ON "app"."commercial_retentions"("attachment_id");
CREATE INDEX "commercial_retentions_firm_id_company_id_type_issue_date_idx" ON "app"."commercial_retentions"("firm_id", "company_id", "type", "issue_date");

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "app"."company_accounting_assignments",
  "app"."company_commercial_settings",
  "app"."commercial_document_items",
  "app"."commercial_accounting_entries",
  "app"."commercial_retentions"
TO proyectoxyz_app, proyectoxyz_worker;

DO $policies$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['company_accounting_assignments', 'company_commercial_settings', 'commercial_accounting_entries', 'commercial_retentions']
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON app.%I FOR ALL USING (firm_id = NULLIF(current_setting(''app.firm_id'', true), '''')::uuid AND (COALESCE(NULLIF(current_setting(''app.firm_scope'', true), '''')::boolean, false) OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting(''app.allowed_company_ids'', true), ''''), '','')::uuid[], ARRAY[]::uuid[])))) WITH CHECK (firm_id = NULLIF(current_setting(''app.firm_id'', true), '''')::uuid AND (COALESCE(NULLIF(current_setting(''app.firm_scope'', true), '''')::boolean, false) OR company_id = ANY(COALESCE(string_to_array(NULLIF(current_setting(''app.allowed_company_ids'', true), ''''), '','')::uuid[], ARRAY[]::uuid[]))))',
      table_name || '_scope_policy', table_name
    );
  END LOOP;
END $policies$;

ALTER TABLE "app"."commercial_document_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."commercial_document_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "commercial_document_items_scope_policy" ON "app"."commercial_document_items" FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "app"."commercial_documents" d
    WHERE d."id" = "document_id"
      AND d."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
        OR d."company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "app"."commercial_documents" d
    WHERE d."id" = "document_id"
      AND d."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
        OR d."company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
  ));
