ALTER TABLE "app"."commercial_documents"
  ADD COLUMN "declared_at" TIMESTAMPTZ(6);

CREATE INDEX "commercial_documents_declared_at_idx"
  ON "app"."commercial_documents"("company_id", "declared_at");
