-- CreateEnum
CREATE TYPE "app"."EmployeeStatus" AS ENUM ('ACTIVE', 'ON_VACATION', 'SICK_LEAVE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "app"."EmployeePaymentMethodType" AS ENUM ('BANK_TRANSFER', 'MOBILE_PAYMENT');

-- DropIndex
DROP INDEX "app"."commercial_documents_declared_at_idx";

-- DropIndex
DROP INDEX "app"."firm_offerings_firm_archive_order_idx";

-- DropIndex
DROP INDEX "app"."firm_offerings_firm_id_kind_taxpayer_condition_active_idx";

-- AlterTable
ALTER TABLE "app"."iva_declarations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "app"."iva_fiscal_books" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "app"."employees" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "full_name" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "birth_date" DATE,
    "admission_date" DATE NOT NULL,
    "role" TEXT,
    "department" TEXT,
    "contract_type" TEXT,
    "schedule" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "food_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "app"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."employee_payment_methods" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "employee_id" UUID NOT NULL,
    "type" "app"."EmployeePaymentMethodType" NOT NULL,
    "bank" TEXT NOT NULL,
    "account" TEXT,
    "phone" TEXT,
    "identity" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_company_id_status_idx" ON "app"."employees"("company_id", "status");

-- CreateIndex
CREATE INDEX "employees_company_id_identity_idx" ON "app"."employees"("company_id", "identity");

-- CreateIndex
CREATE INDEX "employee_payment_methods_employee_id_idx" ON "app"."employee_payment_methods"("employee_id");

-- RenameForeignKey
ALTER TABLE "app"."exchange_rates" RENAME CONSTRAINT "exchange_rates_firm_currency_fkey" TO "exchange_rates_firm_id_currency_fkey";

-- AddForeignKey
ALTER TABLE "app"."employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."employees" ADD CONSTRAINT "employees_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "app"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."employee_payment_methods" ADD CONSTRAINT "employee_payment_methods_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "app"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "app"."commercial_retentions_company_id_type_normalized_receipt_number" RENAME TO "commercial_retentions_company_id_type_normalized_receipt_nu_key";

-- RenameIndex
ALTER INDEX "app"."fiscal_calendars_firm_id_taxpayer_condition_effective_from_effe" RENAME TO "fiscal_calendars_firm_id_taxpayer_condition_effective_from__idx";

-- RenameIndex
ALTER INDEX "app"."iva_declaration_retentions_firm_id_company_id_declaration_id_id" RENAME TO "iva_declaration_retentions_firm_id_company_id_declaration_i_idx";
