-- CreateEnum
CREATE TYPE "app"."UserProfileType" AS ENUM ('STAFF', 'CLIENT');

-- CreateEnum
CREATE TYPE "app"."FirmClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "app"."CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "app"."AssignmentScope" AS ENUM ('FIRM', 'COMPANY', 'BRANCH');

-- CreateEnum
CREATE TYPE "app"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "app"."StoredObjectStatus" AS ENUM ('PENDING', 'QUARANTINED', 'AVAILABLE', 'REJECTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "app"."firms" ADD COLUMN     "email" TEXT,
ADD COLUMN     "fiscal_address" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rif" TEXT,
ADD COLUMN     "trade_name" TEXT;

-- AlterTable
ALTER TABLE "app"."user_profiles" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "profile_type" "app"."UserProfileType" NOT NULL DEFAULT 'STAFF';

-- CreateTable
CREATE TABLE "app"."firm_clients" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "rif" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" "app"."FirmClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "firm_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."companies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "rif" TEXT NOT NULL,
    "normalized_rif" TEXT NOT NULL,
    "activity" TEXT,
    "taxpayer_type" TEXT,
    "fiscal_address" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" "app"."CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."firm_client_companies" (
    "firm_client_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firm_client_companies_pkey" PRIMARY KEY ("firm_client_id","company_id")
);

-- CreateTable
CREATE TABLE "app"."branches" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."permissions" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "app"."roles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable
CREATE TABLE "app"."role_assignments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope" "app"."AssignmentScope" NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."invitations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile_type" "app"."UserProfileType" NOT NULL DEFAULT 'STAFF',
    "role_id" UUID NOT NULL,
    "scope" "app"."AssignmentScope" NOT NULL,
    "company_id" UUID,
    "branch_id" UUID,
    "token_hash" TEXT NOT NULL,
    "status" "app"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "accepted_by_user_id" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."stored_objects" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "company_id" UUID,
    "uploaded_by_user_id" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "declared_mime" TEXT NOT NULL,
    "detected_mime" TEXT,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "status" "app"."StoredObjectStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "scanned_at" TIMESTAMPTZ(6),
    "available_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."documents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "firm_id" UUID NOT NULL,
    "company_id" UUID,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."document_versions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "document_id" UUID NOT NULL,
    "stored_object_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."document_links" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "document_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "firm_clients_firm_id_status_idx" ON "app"."firm_clients"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "firm_clients_firm_id_rif_key" ON "app"."firm_clients"("firm_id", "rif");

-- CreateIndex
CREATE INDEX "companies_firm_id_status_idx" ON "app"."companies"("firm_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "companies_firm_id_normalized_rif_key" ON "app"."companies"("firm_id", "normalized_rif");

-- CreateIndex
CREATE INDEX "firm_client_companies_company_id_idx" ON "app"."firm_client_companies"("company_id");

-- CreateIndex
CREATE INDEX "branches_company_id_active_idx" ON "app"."branches"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "branches_company_id_name_key" ON "app"."branches"("company_id", "name");

-- CreateIndex
CREATE INDEX "roles_firm_id_archived_at_idx" ON "app"."roles"("firm_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_firm_id_slug_key" ON "app"."roles"("firm_id", "slug");

-- CreateIndex
CREATE INDEX "role_permissions_permission_key_idx" ON "app"."role_permissions"("permission_key");

-- CreateIndex
CREATE INDEX "role_assignments_firm_id_user_id_idx" ON "app"."role_assignments"("firm_id", "user_id");

-- CreateIndex
CREATE INDEX "role_assignments_company_id_idx" ON "app"."role_assignments"("company_id");

-- CreateIndex
CREATE INDEX "role_assignments_branch_id_idx" ON "app"."role_assignments"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_user_id_role_id_scope_company_id_branch_id_key" ON "app"."role_assignments"("user_id", "role_id", "scope", "company_id", "branch_id") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "app"."invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_firm_id_email_status_idx" ON "app"."invitations"("firm_id", "email", "status");

-- CreateIndex
CREATE INDEX "invitations_expires_at_status_idx" ON "app"."invitations"("expires_at", "status");

-- CreateIndex
CREATE INDEX "stored_objects_firm_id_company_id_status_idx" ON "app"."stored_objects"("firm_id", "company_id", "status");

-- CreateIndex
CREATE INDEX "stored_objects_checksum_sha256_idx" ON "app"."stored_objects"("checksum_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "stored_objects_bucket_object_key_key" ON "app"."stored_objects"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "documents_firm_id_company_id_category_idx" ON "app"."documents"("firm_id", "company_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_stored_object_id_key" ON "app"."document_versions"("stored_object_id");

-- CreateIndex
CREATE INDEX "document_versions_created_by_user_id_idx" ON "app"."document_versions"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "app"."document_versions"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "document_links_entity_type_entity_id_idx" ON "app"."document_links"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_links_document_id_entity_type_entity_id_key" ON "app"."document_links"("document_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "firms_rif_key" ON "app"."firms"("rif");

-- AddForeignKey
ALTER TABLE "app"."firm_clients" ADD CONSTRAINT "firm_clients_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."companies" ADD CONSTRAINT "companies_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."firm_client_companies" ADD CONSTRAINT "firm_client_companies_firm_client_id_fkey" FOREIGN KEY ("firm_client_id") REFERENCES "app"."firm_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."firm_client_companies" ADD CONSTRAINT "firm_client_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."branches" ADD CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."roles" ADD CONSTRAINT "roles_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "app"."permissions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "app"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "app"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "app"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."stored_objects" ADD CONSTRAINT "stored_objects_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."stored_objects" ADD CONSTRAINT "stored_objects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."stored_objects" ADD CONSTRAINT "stored_objects_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."documents" ADD CONSTRAINT "documents_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."document_versions" ADD CONSTRAINT "document_versions_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "app"."stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."document_versions" ADD CONSTRAINT "document_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."document_links" ADD CONSTRAINT "document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "app"."documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Scope and lifecycle invariants that Prisma cannot express.
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_scope_check" CHECK (
  ("scope" = 'FIRM' AND "company_id" IS NULL AND "branch_id" IS NULL) OR
  ("scope" = 'COMPANY' AND "company_id" IS NOT NULL AND "branch_id" IS NULL) OR
  ("scope" = 'BRANCH' AND "company_id" IS NOT NULL AND "branch_id" IS NOT NULL)
);
ALTER TABLE "app"."role_assignments" ADD CONSTRAINT "role_assignments_validity_check" CHECK ("valid_until" IS NULL OR "valid_until" > "valid_from");
ALTER TABLE "app"."invitations" ADD CONSTRAINT "invitations_scope_check" CHECK (
  ("scope" = 'FIRM' AND "company_id" IS NULL AND "branch_id" IS NULL) OR
  ("scope" = 'COMPANY' AND "company_id" IS NOT NULL AND "branch_id" IS NULL) OR
  ("scope" = 'BRANCH' AND "company_id" IS NOT NULL AND "branch_id" IS NOT NULL)
);
ALTER TABLE "app"."stored_objects" ADD CONSTRAINT "stored_objects_size_check" CHECK ("size_bytes" > 0);
ALTER TABLE "app"."stored_objects" ADD CONSTRAINT "stored_objects_sha256_check" CHECK ("checksum_sha256" ~ '^[0-9a-f]{64}$');

-- Runtime grants are explicit so this migration remains correct even when
-- default privileges differ between environments.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "app" TO proyectoxyz_app, proyectoxyz_worker;

-- Row-level security uses transaction-local settings established by the
-- application after Better Auth has validated the session.
ALTER TABLE "app"."firms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firms" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firms_tenant_policy" ON "app"."firms" USING (
  "id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
) WITH CHECK (
  "id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
);

ALTER TABLE "app"."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."user_profiles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_self_or_firm_policy" ON "app"."user_profiles" USING (
  "user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid OR
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
) WITH CHECK (
  "user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid OR
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
);

ALTER TABLE "app"."firm_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_clients" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_clients_staff_policy" ON "app"."firm_clients" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
);

ALTER TABLE "app"."companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "companies_scope_policy" ON "app"."companies" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  "id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  "id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

ALTER TABLE "app"."firm_client_companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_client_companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_client_companies_scope_policy" ON "app"."firm_client_companies" USING (
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

ALTER TABLE "app"."branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."branches" FORCE ROW LEVEL SECURITY;
CREATE POLICY "branches_scope_policy" ON "app"."branches" USING (
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

ALTER TABLE "app"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "roles_staff_policy" ON "app"."roles" USING (
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
  EXISTS (
    SELECT 1 FROM "app"."invitations" i
    WHERE i."role_id" = "roles"."id"
      AND i."token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), '')
  )
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
);

ALTER TABLE "app"."role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."role_permissions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_assignment_policy" ON "app"."role_permissions" USING (
  EXISTS (
    SELECT 1 FROM "app"."role_assignments" ra
    WHERE ra."role_id" = "role_permissions"."role_id"
      AND ra."user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid
      AND ra."valid_from" <= CURRENT_TIMESTAMP
      AND (ra."valid_until" IS NULL OR ra."valid_until" > CURRENT_TIMESTAMP)
  ) OR EXISTS (
    SELECT 1 FROM "app"."roles" r
    WHERE r."id" = "role_permissions"."role_id"
      AND r."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM "app"."roles" r
    WHERE r."id" = "role_permissions"."role_id"
      AND r."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
  )
);

ALTER TABLE "app"."role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."role_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "role_assignments_self_or_firm_policy" ON "app"."role_assignments" USING (
  "user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid OR
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)
);

ALTER TABLE "app"."invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."invitations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "invitations_staff_policy" ON "app"."invitations" USING (
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
  "token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), '')
) WITH CHECK (
  ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
  "token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), '')
);

ALTER TABLE "app"."stored_objects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."stored_objects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "stored_objects_scope_policy" ON "app"."stored_objects" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (("company_id" IS NULL AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (("company_id" IS NULL AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
);

ALTER TABLE "app"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "documents_scope_policy" ON "app"."documents" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (("company_id" IS NULL AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (("company_id" IS NULL AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false)) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
);

ALTER TABLE "app"."document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."document_versions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_versions_scope_policy" ON "app"."document_versions" USING (
  EXISTS (SELECT 1 FROM "app"."documents" d WHERE d."id" = "document_id")
) WITH CHECK (
  EXISTS (SELECT 1 FROM "app"."documents" d WHERE d."id" = "document_id")
);

ALTER TABLE "app"."document_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."document_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "document_links_scope_policy" ON "app"."document_links" USING (
  EXISTS (SELECT 1 FROM "app"."documents" d WHERE d."id" = "document_id")
) WITH CHECK (
  EXISTS (SELECT 1 FROM "app"."documents" d WHERE d."id" = "document_id")
);
