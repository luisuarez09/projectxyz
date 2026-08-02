CREATE TYPE "app"."FiscalCalendarTaxpayerCondition" AS ENUM ('SPECIAL_TAXPAYER', 'ORDINARY', 'ALL');

CREATE TABLE "app"."firm_offerings" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "kind" "app"."CompanyOfferingKind" NOT NULL,
  "name" TEXT NOT NULL,
  "organism" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "spe_frequency" TEXT,
  "deadline_mode" TEXT NOT NULL,
  "deadline_day_count" INTEGER NOT NULL DEFAULT 0,
  "deadline_day_type" TEXT NOT NULL,
  "deadline_base" TEXT NOT NULL,
  "template_key" TEXT,
  "source" TEXT,
  "effective_from" DATE,
  "effective_to" DATE,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "firm_offerings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."tax_rates" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "offering_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "rate" DECIMAL(8,4) NOT NULL,
  "effective_from" DATE,
  "effective_to" DATE,
  "source" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."fiscal_calendars" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "taxpayer_condition" "app"."FiscalCalendarTaxpayerCondition" NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE NOT NULL,
  "source_gazette" TEXT,
  "source_published_at" DATE,
  "source_provision" TEXT,
  "source_issued_at" DATE,
  "source_note" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "fiscal_calendars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."fiscal_calendar_matrices" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "calendar_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "group_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "short_label" TEXT NOT NULL,
  "cadence" TEXT NOT NULL,
  "period_label" TEXT NOT NULL,
  "note" TEXT,
  "ordinal" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "fiscal_calendar_matrices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."fiscal_calendar_matrix_offerings" (
  "matrix_id" UUID NOT NULL,
  "offering_id" UUID NOT NULL,
  CONSTRAINT "fiscal_calendar_matrix_offerings_pkey" PRIMARY KEY ("matrix_id", "offering_id")
);

CREATE TABLE "app"."fiscal_calendar_dates" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "matrix_id" UUID NOT NULL,
  "rif_criterion" TEXT NOT NULL,
  "period_key" TEXT NOT NULL,
  "due_date" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "fiscal_calendar_dates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "firm_offerings_firm_id_key_key" ON "app"."firm_offerings"("firm_id", "key");
CREATE INDEX "firm_offerings_firm_id_kind_active_idx" ON "app"."firm_offerings"("firm_id", "kind", "active");
CREATE INDEX "tax_rates_firm_id_offering_id_effective_from_idx" ON "app"."tax_rates"("firm_id", "offering_id", "effective_from");
CREATE UNIQUE INDEX "fiscal_calendars_firm_id_key_key" ON "app"."fiscal_calendars"("firm_id", "key");
CREATE INDEX "fiscal_calendars_firm_id_taxpayer_condition_effective_from_effective_to_idx" ON "app"."fiscal_calendars"("firm_id", "taxpayer_condition", "effective_from", "effective_to");
CREATE UNIQUE INDEX "fiscal_calendar_matrices_calendar_id_key_key" ON "app"."fiscal_calendar_matrices"("calendar_id", "key");
CREATE INDEX "fiscal_calendar_matrices_calendar_id_group_key_ordinal_idx" ON "app"."fiscal_calendar_matrices"("calendar_id", "group_key", "ordinal");
CREATE INDEX "fiscal_calendar_matrix_offerings_offering_id_idx" ON "app"."fiscal_calendar_matrix_offerings"("offering_id");
CREATE UNIQUE INDEX "fiscal_calendar_dates_matrix_id_rif_criterion_period_key_key" ON "app"."fiscal_calendar_dates"("matrix_id", "rif_criterion", "period_key");
CREATE INDEX "fiscal_calendar_dates_matrix_id_due_date_idx" ON "app"."fiscal_calendar_dates"("matrix_id", "due_date");

ALTER TABLE "app"."firm_offerings" ADD CONSTRAINT "firm_offerings_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."tax_rates" ADD CONSTRAINT "tax_rates_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."tax_rates" ADD CONSTRAINT "tax_rates_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "app"."firm_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."fiscal_calendars" ADD CONSTRAINT "fiscal_calendars_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."fiscal_calendar_matrices" ADD CONSTRAINT "fiscal_calendar_matrices_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "app"."fiscal_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app"."fiscal_calendar_matrix_offerings" ADD CONSTRAINT "fiscal_calendar_matrix_offerings_matrix_id_fkey" FOREIGN KEY ("matrix_id") REFERENCES "app"."fiscal_calendar_matrices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app"."fiscal_calendar_matrix_offerings" ADD CONSTRAINT "fiscal_calendar_matrix_offerings_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "app"."firm_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."fiscal_calendar_dates" ADD CONSTRAINT "fiscal_calendar_dates_matrix_id_fkey" FOREIGN KEY ("matrix_id") REFERENCES "app"."fiscal_calendar_matrices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "app"."firm_offerings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm_offerings_firm_policy" ON "app"."firm_offerings" USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid) WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
ALTER TABLE "app"."tax_rates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_rates_firm_policy" ON "app"."tax_rates" USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid) WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
ALTER TABLE "app"."fiscal_calendars" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_calendars_firm_policy" ON "app"."fiscal_calendars" USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid) WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
ALTER TABLE "app"."fiscal_calendar_matrices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_calendar_matrices_firm_policy" ON "app"."fiscal_calendar_matrices" USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendars" c WHERE c."id" = "calendar_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid)) WITH CHECK (EXISTS (SELECT 1 FROM "app"."fiscal_calendars" c WHERE c."id" = "calendar_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
ALTER TABLE "app"."fiscal_calendar_matrix_offerings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_calendar_matrix_offerings_firm_policy" ON "app"."fiscal_calendar_matrix_offerings" USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid)) WITH CHECK (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
ALTER TABLE "app"."fiscal_calendar_dates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_calendar_dates_firm_policy" ON "app"."fiscal_calendar_dates" USING (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid)) WITH CHECK (EXISTS (SELECT 1 FROM "app"."fiscal_calendar_matrices" m JOIN "app"."fiscal_calendars" c ON c."id" = m."calendar_id" WHERE m."id" = "matrix_id" AND c."firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid));
