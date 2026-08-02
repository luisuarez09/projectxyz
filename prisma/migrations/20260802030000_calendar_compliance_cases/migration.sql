CREATE TYPE "app"."ComplianceCaseStatus" AS ENUM (
  'PENDING',
  'PREPARING',
  'READY_FOR_REVIEW',
  'SUBMITTED',
  'PAID',
  'CLOSED',
  'INCIDENT',
  'NOT_APPLICABLE'
);

CREATE TYPE "app"."ComplianceActivityMode" AS ENUM (
  'WITH_ACTIVITY',
  'WITHOUT_ACTIVITY'
);

CREATE TABLE "app"."compliance_cases" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "offering_id" UUID NOT NULL,
  "assigned_profile_id" UUID,
  "period_key" TEXT NOT NULL,
  "period_label" TEXT NOT NULL,
  "period_month" DATE NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "due_date" DATE,
  "status" "app"."ComplianceCaseStatus" NOT NULL DEFAULT 'PENDING',
  "activity_mode" "app"."ComplianceActivityMode",
  "filed_at" DATE,
  "paid_at" DATE,
  "amount" DECIMAL(20,6),
  "offering_name" TEXT NOT NULL,
  "offering_kind" "app"."CompanyOfferingKind" NOT NULL,
  "organism" TEXT NOT NULL,
  "cadence" TEXT NOT NULL,
  "regime" TEXT NOT NULL,
  "deadline_basis" TEXT NOT NULL,
  "rule_version" INTEGER NOT NULL,
  "source_snapshot" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "compliance_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_cases_company_id_offering_id_period_key_key"
  ON "app"."compliance_cases"("company_id", "offering_id", "period_key");
CREATE INDEX "compliance_cases_firm_id_period_month_status_idx"
  ON "app"."compliance_cases"("firm_id", "period_month", "status");
CREATE INDEX "compliance_cases_company_id_period_month_due_date_idx"
  ON "app"."compliance_cases"("company_id", "period_month", "due_date");
CREATE INDEX "compliance_cases_assigned_profile_id_status_idx"
  ON "app"."compliance_cases"("assigned_profile_id", "status");

ALTER TABLE "app"."compliance_cases"
  ADD CONSTRAINT "compliance_cases_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_cases"
  ADD CONSTRAINT "compliance_cases_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_cases"
  ADD CONSTRAINT "compliance_cases_offering_id_fkey"
  FOREIGN KEY ("offering_id") REFERENCES "app"."firm_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."compliance_cases"
  ADD CONSTRAINT "compliance_cases_assigned_profile_id_fkey"
  FOREIGN KEY ("assigned_profile_id") REFERENCES "app"."user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "app"."compliance_cases"
  TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."compliance_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."compliance_cases" FORCE ROW LEVEL SECURITY;

CREATE POLICY "compliance_cases_read_policy" ON "app"."compliance_cases"
  FOR SELECT USING (
    "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
    AND "company_id" = ANY(COALESCE(
      string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[],
      ARRAY[]::uuid[]
    ))
  );

CREATE POLICY "compliance_cases_write_policy" ON "app"."compliance_cases"
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

INSERT INTO "app"."permissions" ("key", "description") VALUES
  ('calendar.read', 'Consultar calendario y expedientes de cumplimiento'),
  ('calendar.manage', 'Preparar y actualizar expedientes de cumplimiento')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT "id", 'calendar.read'
FROM "app"."roles"
WHERE "slug" IN ('administrador', 'supervisor', 'colaborador')
ON CONFLICT DO NOTHING;

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT "id", 'calendar.manage'
FROM "app"."roles"
WHERE "slug" IN ('administrador', 'supervisor', 'colaborador')
ON CONFLICT DO NOTHING;
