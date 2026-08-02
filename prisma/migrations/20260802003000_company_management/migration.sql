CREATE TYPE "app"."CompanyOfferingKind" AS ENUM ('TAX', 'SERVICE');

ALTER TABLE "app"."user_profiles"
  ADD COLUMN "active_company_id" UUID;

ALTER TABLE "app"."companies"
  ADD COLUMN "responsible_profile_id" UUID,
  ADD COLUMN "service_plan" TEXT,
  ADD COLUMN "ivss_employer_number" TEXT,
  ADD COLUMN "faov_payroll_number" TEXT,
  ADD COLUMN "incorporation_date" DATE,
  ADD COLUMN "commercial_registry" TEXT,
  ADD COLUMN "registry_folio" TEXT,
  ADD COLUMN "registry_document" TEXT,
  ADD COLUMN "share_capital" TEXT,
  ADD COLUMN "inces_rncp" TEXT,
  ADD COLUMN "legal_representative_name" TEXT,
  ADD COLUMN "legal_representative_document" TEXT,
  ADD COLUMN "legal_representative_phone" TEXT,
  ADD COLUMN "legal_representative_email" TEXT,
  ADD COLUMN "client_portal_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "restricted_tax_access_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "app"."company_officers" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "company_id" UUID NOT NULL,
  "position" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "term_starts_at" DATE,
  "term_ends_at" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "company_officers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."company_offerings" (
  "company_id" UUID NOT NULL,
  "kind" "app"."CompanyOfferingKind" NOT NULL,
  "offering_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_offerings_pkey" PRIMARY KEY ("company_id", "kind", "offering_key")
);

CREATE TABLE "app"."company_municipal_activities" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "company_id" UUID NOT NULL,
  "branch_name" TEXT,
  "jurisdiction" TEXT NOT NULL,
  "economic_activity" TEXT NOT NULL,
  "rate" DECIMAL(10,4) NOT NULL,
  "effective_from" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "company_municipal_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_profiles_active_company_id_idx" ON "app"."user_profiles"("active_company_id");
CREATE INDEX "companies_responsible_profile_id_idx" ON "app"."companies"("responsible_profile_id");
CREATE INDEX "company_officers_company_id_idx" ON "app"."company_officers"("company_id");
CREATE INDEX "company_offerings_company_id_kind_idx" ON "app"."company_offerings"("company_id", "kind");
CREATE INDEX "company_municipal_activities_company_id_effective_from_idx" ON "app"."company_municipal_activities"("company_id", "effective_from");

ALTER TABLE "app"."user_profiles"
  ADD CONSTRAINT "user_profiles_active_company_id_fkey"
  FOREIGN KEY ("active_company_id") REFERENCES "app"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "app"."companies"
  ADD CONSTRAINT "companies_responsible_profile_id_fkey"
  FOREIGN KEY ("responsible_profile_id") REFERENCES "app"."user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "app"."company_officers"
  ADD CONSTRAINT "company_officers_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."company_offerings"
  ADD CONSTRAINT "company_offerings_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."company_municipal_activities"
  ADD CONSTRAINT "company_municipal_activities_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."company_officers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_officers_scope_policy" ON "app"."company_officers" USING (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

ALTER TABLE "app"."company_offerings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_offerings_scope_policy" ON "app"."company_offerings" USING (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

ALTER TABLE "app"."company_municipal_activities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_municipal_activities_scope_policy" ON "app"."company_municipal_activities" USING (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

INSERT INTO "app"."permissions" ("key", "description")
VALUES ('companies.manage', 'Crear y modificar empresas de la firma')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT "id", 'companies.manage'
FROM "app"."roles"
WHERE "slug" = 'administrador' AND "archived_at" IS NULL
ON CONFLICT DO NOTHING;
