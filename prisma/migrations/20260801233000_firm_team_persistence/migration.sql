CREATE TYPE "app"."InvitationDeliveryMethod" AS ENUM ('MANUAL_LINK', 'SMTP');

ALTER TABLE "app"."firms"
  ADD COLUMN "pdf_header" TEXT,
  ADD COLUMN "pdf_footer" TEXT,
  ADD COLUMN "logo_stored_object_id" UUID;

ALTER TABLE "app"."user_profiles"
  ADD COLUMN "retired_at" TIMESTAMPTZ(6);

ALTER TABLE "app"."invitations"
  ADD COLUMN "last_delivery_method" "app"."InvitationDeliveryMethod",
  ADD COLUMN "last_delivered_at" TIMESTAMPTZ(6),
  ADD COLUMN "position" TEXT,
  ADD COLUMN "profession" TEXT;

CREATE UNIQUE INDEX "firms_logo_stored_object_id_key"
  ON "app"."firms"("logo_stored_object_id");

ALTER TABLE "app"."firms"
  ADD CONSTRAINT "firms_logo_stored_object_id_fkey"
  FOREIGN KEY ("logo_stored_object_id") REFERENCES "app"."stored_objects"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "app"."user_profiles"
  ADD CONSTRAINT "user_profiles_retired_check"
  CHECK ("retired_at" IS NULL OR "active" = false);

CREATE TABLE "app"."invitation_company_access" (
  "invitation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitation_company_access_pkey" PRIMARY KEY ("invitation_id", "company_id")
);

CREATE INDEX "invitation_company_access_company_id_idx"
  ON "app"."invitation_company_access"("company_id");

ALTER TABLE "app"."invitation_company_access"
  ADD CONSTRAINT "invitation_company_access_invitation_id_fkey"
  FOREIGN KEY ("invitation_id") REFERENCES "app"."invitations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."invitation_company_access"
  ADD CONSTRAINT "invitation_company_access_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "app"."invitation_company_access"
  TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."invitation_company_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."invitation_company_access" FORCE ROW LEVEL SECURITY;
CREATE POLICY "invitation_company_access_staff_policy"
  ON "app"."invitation_company_access"
  USING (EXISTS (
    SELECT 1 FROM "app"."invitations" i
    WHERE i."id" = "invitation_company_access"."invitation_id"
      AND ((i."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
        AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
        OR i."token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), ''))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "app"."invitations" i
    WHERE i."id" = "invitation_company_access"."invitation_id"
      AND ((i."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
        AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
        OR i."token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), ''))
  ));

DROP POLICY "role_assignments_self_or_firm_policy" ON "app"."role_assignments";
CREATE POLICY "role_assignments_self_or_firm_policy" ON "app"."role_assignments"
  USING (
    "user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid OR
    ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  )
  WITH CHECK (
    ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid
      AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
    OR
    ("user_id" = NULLIF(current_setting('app.user_id', true), '')::uuid AND EXISTS (
      SELECT 1 FROM "app"."invitations" i
      WHERE i."token_hash" = NULLIF(current_setting('app.invitation_token_hash', true), '')
        AND i."status" = 'PENDING'
        AND i."role_id" = "role_assignments"."role_id"
        AND i."firm_id" = "role_assignments"."firm_id"
        AND (
          (i."scope" = "role_assignments"."scope"
            AND i."company_id" IS NOT DISTINCT FROM "role_assignments"."company_id"
            AND i."branch_id" IS NOT DISTINCT FROM "role_assignments"."branch_id")
          OR
          ("role_assignments"."scope" = 'COMPANY' AND EXISTS (
            SELECT 1 FROM "app"."invitation_company_access" ica
            WHERE ica."invitation_id" = i."id"
              AND ica."company_id" = "role_assignments"."company_id"
          ))
        )
    ))
  );
