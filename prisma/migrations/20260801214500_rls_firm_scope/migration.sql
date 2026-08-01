-- Firm-scoped roles can reach every company in their firm. Company- and
-- branch-scoped roles remain restricted to app.allowed_company_ids.
DROP POLICY "companies_scope_policy" ON "app"."companies";
CREATE POLICY "companies_scope_policy" ON "app"."companies" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
);

DROP POLICY "firm_client_companies_scope_policy" ON "app"."firm_client_companies";
CREATE POLICY "firm_client_companies_scope_policy" ON "app"."firm_client_companies" USING (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

DROP POLICY "branches_scope_policy" ON "app"."branches";
CREATE POLICY "branches_scope_policy" ON "app"."branches" USING (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
) WITH CHECK (
  COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
  "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[]))
);

DROP POLICY "stored_objects_scope_policy" ON "app"."stored_objects";
CREATE POLICY "stored_objects_scope_policy" ON "app"."stored_objects" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
);

DROP POLICY "documents_scope_policy" ON "app"."documents";
CREATE POLICY "documents_scope_policy" ON "app"."documents" USING (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
) WITH CHECK (
  "firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND
  (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) OR
   "company_id" = ANY(COALESCE(string_to_array(NULLIF(current_setting('app.allowed_company_ids', true), ''), ',')::uuid[], ARRAY[]::uuid[])))
);
