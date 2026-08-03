ALTER TABLE "app"."commercial_documents"
  ADD COLUMN "non_taxable_amount" DECIMAL(20,6) NOT NULL DEFAULT 0;
