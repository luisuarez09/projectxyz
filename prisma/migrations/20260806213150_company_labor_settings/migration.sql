-- CreateTable
CREATE TABLE "app"."company_labor_settings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "company_id" UUID NOT NULL,
    "payroll_frequency" TEXT NOT NULL DEFAULT 'BIWEEKLY',
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "rate_source" TEXT NOT NULL DEFAULT 'BCV',
    "rate_lock_moment" TEXT NOT NULL DEFAULT 'PAYROLL_CREATION',
    "min_wage_amount" DECIMAL(20,2),
    "min_wage_currency" TEXT NOT NULL DEFAULT 'VES',
    "min_wage_effective_from" DATE,
    "min_wage_source" TEXT,
    "benefit_scheme" TEXT NOT NULL DEFAULT 'LEGAL',
    "vacation_schedule" TEXT NOT NULL DEFAULT 'ANNIVERSARY',
    "vacation_days_base" INTEGER NOT NULL DEFAULT 15,
    "vacation_days_increment" INTEGER NOT NULL DEFAULT 1,
    "vacation_days_cap" INTEGER NOT NULL DEFAULT 30,
    "vacation_basis" TEXT NOT NULL DEFAULT 'AGREED_SALARY',
    "bonus_days_base" INTEGER NOT NULL DEFAULT 15,
    "bonus_days_increment" INTEGER NOT NULL DEFAULT 1,
    "bonus_days_cap" INTEGER NOT NULL DEFAULT 30,
    "bonus_basis" TEXT NOT NULL DEFAULT 'PENDING',
    "profit_days_base" INTEGER NOT NULL DEFAULT 30,
    "profit_days_increment" INTEGER NOT NULL DEFAULT 0,
    "profit_days_cap" INTEGER NOT NULL DEFAULT 0,
    "profit_basis" TEXT NOT NULL DEFAULT 'PENDING',
    "food_bonus_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "food_bonus_currency" TEXT NOT NULL DEFAULT 'USD',
    "food_bonus_cadence" TEXT NOT NULL DEFAULT 'BIWEEKLY',
    "food_bonus_source" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_labor_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."company_labor_deductions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "settings_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_percent" DECIMAL(8,4),
    "basis" TEXT NOT NULL DEFAULT 'PENDING',
    "cap" DECIMAL(20,2),
    "cap_currency" TEXT NOT NULL DEFAULT 'VES',
    "effective_from" DATE,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_labor_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_labor_settings_company_id_key" ON "app"."company_labor_settings"("company_id");

-- CreateIndex
CREATE INDEX "company_labor_deductions_settings_id_active_idx" ON "app"."company_labor_deductions"("settings_id", "active");

-- AddForeignKey
ALTER TABLE "app"."company_labor_settings" ADD CONSTRAINT "company_labor_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "app"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."company_labor_deductions" ADD CONSTRAINT "company_labor_deductions_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "app"."company_labor_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
