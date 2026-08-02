INSERT INTO "app"."permissions" ("key", "description")
VALUES (
  'calendar.reset',
  'Restablecer expedientes y eliminar sus soportes'
)
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "app"."role_permissions" ("role_id", "permission_key")
SELECT role."id", 'calendar.reset'
FROM "app"."roles" AS role
WHERE role."slug" = 'administrador'
ON CONFLICT DO NOTHING;

GRANT DELETE ON "app"."compliance_case_evidences"
  TO proyectoxyz_app, proyectoxyz_worker;
