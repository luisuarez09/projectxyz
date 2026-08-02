ALTER TABLE "app"."firm_offerings"
  ADD COLUMN "taxpayer_condition" "app"."FiscalCalendarTaxpayerCondition" NOT NULL DEFAULT 'ALL';

CREATE INDEX "firm_offerings_firm_id_kind_taxpayer_condition_active_idx"
  ON "app"."firm_offerings"("firm_id", "kind", "taxpayer_condition", "active");
