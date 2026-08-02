ALTER TABLE "app"."compliance_cases"
  ADD COLUMN "suppressed_at" TIMESTAMPTZ(6),
  ADD COLUMN "suppression_reason" TEXT;

CREATE INDEX "compliance_cases_firm_id_period_month_suppressed_at_idx"
  ON "app"."compliance_cases"("firm_id", "period_month", "suppressed_at");

INSERT INTO "app"."permissions" ("key", "description")
VALUES (
  'calendar.reconcile',
  'Conciliar el calendario después de cambios administrativos'
)
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT role."id", 'calendar.reconcile'
FROM "app"."roles" AS role
WHERE role."slug" = 'administrador'
ON CONFLICT DO NOTHING;
