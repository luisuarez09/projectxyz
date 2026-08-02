CREATE TYPE "app"."ComplianceEvidenceKind" AS ENUM (
  'DECLARATION_RECEIPT',
  'DECLARATION_FILE',
  'PAYMENT_FORM',
  'PAYMENT_RECEIPT',
  'INVOICE',
  'OTHER'
);

CREATE TABLE "app"."compliance_case_evidences" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "stored_object_id" UUID NOT NULL,
  "uploaded_by_user_id" UUID NOT NULL,
  "kind" "app"."ComplianceEvidenceKind" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "compliance_case_evidences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_case_evidences_stored_object_id_key"
  ON "app"."compliance_case_evidences"("stored_object_id");
CREATE UNIQUE INDEX "compliance_case_evidences_case_id_kind_key"
  ON "app"."compliance_case_evidences"("case_id", "kind");
CREATE INDEX "compliance_case_evidences_firm_id_company_id_created_at_idx"
  ON "app"."compliance_case_evidences"("firm_id", "company_id", "created_at");
CREATE INDEX "compliance_case_evidences_uploaded_by_user_id_idx"
  ON "app"."compliance_case_evidences"("uploaded_by_user_id");

ALTER TABLE "app"."compliance_case_evidences"
  ADD CONSTRAINT "compliance_case_evidences_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_case_evidences"
  ADD CONSTRAINT "compliance_case_evidences_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_case_evidences"
  ADD CONSTRAINT "compliance_case_evidences_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "app"."compliance_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_case_evidences"
  ADD CONSTRAINT "compliance_case_evidences_stored_object_id_fkey"
  FOREIGN KEY ("stored_object_id") REFERENCES "app"."stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_case_evidences"
  ADD CONSTRAINT "compliance_case_evidences_uploaded_by_user_id_fkey"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "app"."compliance_case_evidences"
  TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."compliance_case_evidences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."compliance_case_evidences" FORCE ROW LEVEL SECURITY;

CREATE POLICY "compliance_case_evidences_read_policy" ON "app"."compliance_case_evidences"
  FOR SELECT USING (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND "company_id" = ANY(COALESCE(
      string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[],
      ARRAY[]::uuid[]
    ))
  );

CREATE POLICY "compliance_case_evidences_write_policy" ON "app"."compliance_case_evidences"
  FOR ALL USING (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND "company_id" = ANY(COALESCE(
      string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[],
      ARRAY[]::uuid[]
    ))
  ) WITH CHECK (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND "company_id" = ANY(COALESCE(
      string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[],
      ARRAY[]::uuid[]
    ))
  );
