CREATE TYPE "app"."FirmCurrencySource" AS ENUM ('BCV', 'MANUAL', 'EXTERNAL');

ALTER TABLE "app"."firms"
  ADD COLUMN "exchange_rate_sync_start" TEXT NOT NULL DEFAULT '18:00',
  ADD COLUMN "exchange_rate_sync_end" TEXT NOT NULL DEFAULT '21:00',
  ADD COLUMN "exchange_rate_sync_interval" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "app"."firms"
  ADD CONSTRAINT "firms_exchange_rate_schedule_check" CHECK (
    "exchange_rate_sync_start" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "exchange_rate_sync_end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "exchange_rate_sync_start" < "exchange_rate_sync_end"
    AND "exchange_rate_sync_interval" IN (30, 60, 90, 120)
  );

CREATE TABLE "app"."firm_currencies" (
  "id" UUID NOT NULL DEFAULT uuidv7(),
  "firm_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT,
  "source" "app"."FirmCurrencySource" NOT NULL,
  "source_name" TEXT,
  "source_url" TEXT,
  "automatic_enabled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "firm_currencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "firm_currencies_code_check" CHECK ("code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "firm_currencies_source_check" CHECK (
    ("source" = 'BCV' AND "code" IN ('USD', 'EUR', 'CNY', 'TRY', 'RUB'))
    OR ("source" = 'MANUAL' AND NOT "automatic_enabled")
    OR ("source" = 'EXTERNAL' AND NOT "automatic_enabled" AND length(trim(COALESCE("source_name", ''))) >= 2 AND "source_url" ~ '^https://')
  ),
  CONSTRAINT "firm_currencies_automatic_check" CHECK (NOT "automatic_enabled" OR ("active" AND "source" = 'BCV'))
);

CREATE UNIQUE INDEX "firm_currencies_firm_id_code_key" ON "app"."firm_currencies"("firm_id", "code");
CREATE INDEX "firm_currencies_firm_id_active_idx" ON "app"."firm_currencies"("firm_id", "active");

ALTER TABLE "app"."firm_currencies" ADD CONSTRAINT "firm_currencies_firm_id_fkey"
  FOREIGN KEY ("firm_id") REFERENCES "app"."firms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "app"."firm_currencies" ("firm_id", "code", "name", "symbol", "source", "source_name", "source_url", "automatic_enabled", "active", "updated_at")
SELECT "id", 'USD', 'Dólar estadounidense', '$', 'BCV', 'Banco Central de Venezuela', 'https://www.bcv.org.ve/', true, true, CURRENT_TIMESTAMP
FROM "app"."firms";

INSERT INTO "app"."firm_currencies" ("firm_id", "code", "name", "symbol", "source", "source_name", "source_url", "automatic_enabled", "active", "updated_at")
SELECT "id", 'EUR', 'Euro', '€', 'BCV', 'Banco Central de Venezuela', 'https://www.bcv.org.ve/', true, true, CURRENT_TIMESTAMP
FROM "app"."firms";

ALTER TABLE "app"."exchange_rates" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
DROP TYPE "app"."ExchangeRateCurrency";

ALTER TABLE "app"."exchange_rates" ADD CONSTRAINT "exchange_rates_firm_currency_fkey"
  FOREIGN KEY ("firm_id", "currency") REFERENCES "app"."firm_currencies"("firm_id", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "app"."firm_currencies" TO proyectoxyz_app, proyectoxyz_worker;

ALTER TABLE "app"."firm_currencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app"."firm_currencies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "firm_currencies_read_policy" ON "app"."firm_currencies" FOR SELECT TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid);
CREATE POLICY "firm_currencies_manage_policy" ON "app"."firm_currencies" FOR ALL TO proyectoxyz_app
  USING ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false))
  WITH CHECK ("firm_id" = NULLIF(current_setting('app.firm_id', true), '')::uuid AND COALESCE(NULLIF(current_setting('app.firm_scope', true), '')::boolean, false));
CREATE POLICY "firm_currencies_worker_policy" ON "app"."firm_currencies" FOR ALL TO proyectoxyz_worker USING (true) WITH CHECK (true);
