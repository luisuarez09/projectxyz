ALTER TYPE "app"."ComplianceEvidenceKind" ADD VALUE IF NOT EXISTS 'SOLVENCY' BEFORE 'DECLARATION_RECEIPT';

ALTER TABLE "app"."firm_offerings"
  ADD COLUMN "evidence_requirements" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "app"."firm_offerings"
SET "deadline_base" = 'period-start'
WHERE "deadline_base" = 'next-period-start';

UPDATE "app"."firm_offerings"
SET "evidence_requirements" = '[
  {"kind":"DECLARATION_RECEIPT","required":true},
  {"kind":"DECLARATION_FILE","required":true},
  {"kind":"PAYMENT_FORM","required":false},
  {"kind":"PAYMENT_RECEIPT","required":false}
]'::jsonb
WHERE "kind" = 'TAX';

ALTER TABLE "app"."compliance_cases"
  ADD COLUMN "evidence_requirements" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "app"."compliance_cases" AS cases
SET "evidence_requirements" = offerings."evidence_requirements"
FROM "app"."firm_offerings" AS offerings
WHERE offerings."id" = cases."offering_id";
