CREATE TYPE "app"."ExchangeRateCurrency" AS ENUM ('USD', 'EUR');
CREATE TYPE "app"."ExchangeRateSourceKind" AS ENUM ('BCV', 'MANUAL');
CREATE TYPE "app"."ExchangeRateSyncTrigger" AS ENUM ('AUTOMATIC', 'MANUAL');
CREATE TYPE "app"."ExchangeRateSyncStatus" AS ENUM ('SUCCEEDED', 'NO_CHANGE', 'FAILED');

CREATE TABLE "app"."exchange_rates" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "currency" "app"."ExchangeRateCurrency" NOT NULL,
  "rate" DECIMAL(20,8) NOT NULL,
  "effective_date" DATE NOT NULL,
  "source_kind" "app"."ExchangeRateSourceKind" NOT NULL,
  "source_url" TEXT,
  "source_hash" TEXT,
  "source_published_at" TIMESTAMPTZ(6),
  "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manual_reason" TEXT,
  "recorded_by_user_id" UUID,
  "superseded_at" TIMESTAMPTZ(6),
  "superseded_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exchange_rates_positive_rate_check" CHECK ("rate" > 0),
  CONSTRAINT "exchange_rates_source_data_check" CHECK (
    ("source_kind" = 'BCV' AND "source_url" IS NOT NULL AND "source_hash" IS NOT NULL AND "manual_reason" IS NULL)
    OR
    ("source_kind" = 'MANUAL' AND "recorded_by_user_id" IS NOT NULL AND length(trim("manual_reason")) >= 8)
  )
);

CREATE TABLE "app"."exchange_rate_sync_runs" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "trigger" "app"."ExchangeRateSyncTrigger" NOT NULL,
  "status" "app"."ExchangeRateSyncStatus" NOT NULL,
  "schedule_key" TEXT,
  "effective_date" DATE,
  "rates_found" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "initiated_by_user_id" UUID,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exchange_rate_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exchange_rates_firm_id_currency_effective_date_idx" ON "app"."exchange_rates"("firm_id", "currency", "effective_date");
CREATE INDEX "exchange_rates_recorded_by_user_id_idx" ON "app"."exchange_rates"("recorded_by_user_id");
CREATE UNIQUE INDEX "exchange_rates_current_key" ON "app"."exchange_rates"("firm_id", "currency", "effective_date") WHERE "superseded_at" IS NULL;
CREATE UNIQUE INDEX "exchange_rate_sync_runs_firm_id_schedule_key_key" ON "app"."exchange_rate_sync_runs"("firm_id", "schedule_key");
CREATE INDEX "exchange_rate_sync_runs_firm_id_started_at_idx" ON "app"."exchange_rate_sync_runs"("firm_id", "started_at");
CREATE INDEX "exchange_rate_sync_runs_initiated_by_user_id_idx" ON "app"."exchange_rate_sync_runs"("initiated_by_user_id");

ALTER TABLE "app"."exchange_rates" ADD CONSTRAINT "exchange_rates_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."exchange_rates" ADD CONSTRAINT "exchange_rates_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."exchange_rates" ADD CONSTRAINT "exchange_rates_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "app"."exchange_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."exchange_rate_sync_runs" ADD CONSTRAINT "exchange_rate_sync_runs_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."exchange_rate_sync_runs" ADD CONSTRAINT "exchange_rate_sync_runs_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "app"."exchange_rates", "app"."exchange_rate_sync_runs" TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."exchange_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."exchange_rates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rates_read_policy" ON "app"."exchange_rates" FOR SELECT TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "exchange_rates_manage_policy" ON "app"."exchange_rates" FOR ALL TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));
CREATE POLICY "exchange_rates_worker_policy" ON "app"."exchange_rates" FOR ALL TO proyectoxyz_worker USING (true) WITH CHECK (true);

ALTER TABLE "app"."exchange_rate_sync_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."exchange_rate_sync_runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rate_sync_runs_read_policy" ON "app"."exchange_rate_sync_runs" FOR SELECT TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "exchange_rate_sync_runs_manage_policy" ON "app"."exchange_rate_sync_runs" FOR ALL TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));
CREATE POLICY "exchange_rate_sync_runs_worker_policy" ON "app"."exchange_rate_sync_runs" FOR ALL TO proyectoxyz_worker USING (true) WITH CHECK (true);

CREATE POLICY "firms_worker_exchange_rate_policy" ON "app"."firms" FOR SELECT TO proyectoxyz_worker USING (true);
