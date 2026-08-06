export type LaborPayrollFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type LaborRateSource = "BCV" | "COMPANY";
export type LaborRateLockMoment = "PAYROLL_CREATION" | "PAYMENT_DATE" | "FIRST_PERIOD";
export type LaborBenefitScheme = "LEGAL" | "CUSTOM";
export type LaborVacationSchedule = "ANNIVERSARY" | "YEAR_END";
export type LaborCalculationBasis = "PENDING" | "MIN_WAGE" | "AGREED_SALARY" | "AVERAGE_SALARY" | "CUSTOM";
export type LaborFoodBonusCadence = "BIWEEKLY" | "MONTHLY";

export const laborPayrollFrequencyLabel: Record<LaborPayrollFrequency, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export const laborRateSourceLabel: Record<LaborRateSource, string> = {
  BCV: "Tasa oficial BCV",
  COMPANY: "Tasa propia de la empresa",
};

export const laborRateLockMomentLabel: Record<LaborRateLockMoment, string> = {
  PAYROLL_CREATION: "Al crear la nómina",
  PAYMENT_DATE: "En la fecha de pago",
  FIRST_PERIOD: "Primera quincena del período",
};

export const laborCalculationBasisLabel: Record<LaborCalculationBasis, string> = {
  PENDING: "Pendiente de definir",
  MIN_WAGE: "Salario mínimo",
  AGREED_SALARY: "Salario acordado",
  AVERAGE_SALARY: "Promedio del período",
  CUSTOM: "Base personalizada",
};

export type LaborDeductionRow = {
  id?: string;
  name: string;
  ratePercent: string;
  basis: LaborCalculationBasis;
  cap: string;
  capCurrency: string;
  effectiveFrom: string;
  source: string;
  active: boolean;
};

export type LaborSettingsFormData = {
  version?: number;
  payrollFrequency: LaborPayrollFrequency;
  salaryCurrency: string;
  rateSource: LaborRateSource;
  rateLockMoment: LaborRateLockMoment;

  minWageAmount: string;
  minWageCurrency: string;
  minWageEffectiveFrom: string;
  minWageSource: string;

  benefitScheme: LaborBenefitScheme;
  vacationSchedule: LaborVacationSchedule;

  vacationDaysBase: string;
  vacationDaysIncrement: string;
  vacationDaysCap: string;
  vacationBasis: LaborCalculationBasis;

  bonusDaysBase: string;
  bonusDaysIncrement: string;
  bonusDaysCap: string;
  bonusBasis: LaborCalculationBasis;

  profitDaysBase: string;
  profitDaysIncrement: string;
  profitDaysCap: string;
  profitBasis: LaborCalculationBasis;

  foodBonusAmount: string;
  foodBonusCurrency: string;
  foodBonusCadence: LaborFoodBonusCadence;
  foodBonusSource: string;

  deductions: LaborDeductionRow[];
};

export type LaborSettingsDetail = LaborSettingsFormData & {
  id: string;
  version: number;
};

export const emptyLaborSettings: LaborSettingsFormData = {
  payrollFrequency: "BIWEEKLY",
  salaryCurrency: "USD",
  rateSource: "BCV",
  rateLockMoment: "PAYROLL_CREATION",

  minWageAmount: "",
  minWageCurrency: "VES",
  minWageEffectiveFrom: "",
  minWageSource: "",

  benefitScheme: "LEGAL",
  vacationSchedule: "ANNIVERSARY",

  vacationDaysBase: "15",
  vacationDaysIncrement: "1",
  vacationDaysCap: "30",
  vacationBasis: "AGREED_SALARY",

  bonusDaysBase: "15",
  bonusDaysIncrement: "1",
  bonusDaysCap: "30",
  bonusBasis: "PENDING",

  profitDaysBase: "30",
  profitDaysIncrement: "0",
  profitDaysCap: "0",
  profitBasis: "PENDING",

  foodBonusAmount: "40",
  foodBonusCurrency: "USD",
  foodBonusCadence: "BIWEEKLY",
  foodBonusSource: "",

  deductions: [
    { name: "Seguro social · IVSS", ratePercent: "", basis: "PENDING", cap: "", capCurrency: "VES", effectiveFrom: "", source: "", active: true },
    { name: "FAOV", ratePercent: "", basis: "PENDING", cap: "", capCurrency: "VES", effectiveFrom: "", source: "", active: true },
    { name: "INCES", ratePercent: "", basis: "PENDING", cap: "", capCurrency: "VES", effectiveFrom: "", source: "", active: true },
    { name: "Desarrollo del Régimen Prestacional de Empleo (DPP)", ratePercent: "", basis: "PENDING", cap: "", capCurrency: "VES", effectiveFrom: "", source: "", active: true },
  ],
};
