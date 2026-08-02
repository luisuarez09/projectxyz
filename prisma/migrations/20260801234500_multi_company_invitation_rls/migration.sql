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
