GRANT SELECT, INSERT, UPDATE, DELETE ON
  "app"."firm_offerings",
  "app"."tax_rates",
  "app"."fiscal_calendars",
  "app"."fiscal_calendar_matrices",
  "app"."fiscal_calendar_matrix_offerings",
  "app"."fiscal_calendar_dates"
TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."firm_offerings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "app"."tax_rates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "app"."fiscal_calendars" FORCE ROW LEVEL SECURITY;
ALTER TABLE "app"."fiscal_calendar_matrices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "app"."fiscal_calendar_matrix_offerings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "app"."fiscal_calendar_dates" FORCE ROW LEVEL SECURITY;

DROP POLICY "firm_offerings_firm_policy" ON "app"."firm_offerings";
CREATE POLICY "firm_offerings_read_policy" ON "app"."firm_offerings" FOR SELECT USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "firm_offerings_manage_policy" ON "app"."firm_offerings" FOR ALL
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));

DROP POLICY "tax_rates_firm_policy" ON "app"."tax_rates";
CREATE POLICY "tax_rates_read_policy" ON "app"."tax_rates" FOR SELECT USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "tax_rates_manage_policy" ON "app"."tax_rates" FOR ALL
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));

DROP POLICY "fiscal_calendars_firm_policy" ON "app"."fiscal_calendars";
CREATE POLICY "fiscal_calendars_read_policy" ON "app"."fiscal_calendars" FOR SELECT USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "fiscal_calendars_manage_policy" ON "app"."fiscal_calendars" FOR ALL
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));

DROP POLICY "fiscal_calendar_matrices_firm_policy" ON "app"."fiscal_calendar_matrices";
CREATE POLICY "fiscal_calendar_matrices_read_policy" ON "app"."fiscal_calendar_matrices" FOR SELECT USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendars" c WHERE c."id" = "calendar_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
CREATE POLICY "fiscal_calendar_matrices_manage_policy" ON "app"."fiscal_calendar_matrices" FOR ALL
  USING (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendars" c WHERE c."id" = "calendar_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid))
  WITH CHECK (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendars" c WHERE c."id" = "calendar_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));

DROP POLICY "fiscal_calendar_matrix_offerings_firm_policy" ON "app"."fiscal_calendar_matrix_offerings";
CREATE POLICY "fiscal_calendar_matrix_offerings_read_policy" ON "app"."fiscal_calendar_matrix_offerings" FOR SELECT USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
CREATE POLICY "fiscal_calendar_matrix_offerings_manage_policy" ON "app"."fiscal_calendar_matrix_offerings" FOR ALL
  USING (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid))
  WITH CHECK (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));

DROP POLICY "fiscal_calendar_dates_firm_policy" ON "app"."fiscal_calendar_dates";
CREATE POLICY "fiscal_calendar_dates_read_policy" ON "app"."fiscal_calendar_dates" FOR SELECT USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
CREATE POLICY "fiscal_calendar_dates_manage_policy" ON "app"."fiscal_calendar_dates" FOR ALL
  USING (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid))
  WITH CHECK (COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false) AND EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
