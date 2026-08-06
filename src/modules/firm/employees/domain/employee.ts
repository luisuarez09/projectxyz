// Tipos del dominio de empleados.
// Los valores de status siguen el enum EmployeeStatus de Prisma.

export type EmployeeStatus =
  | "ACTIVE"
  | "ON_VACATION"
  | "SICK_LEAVE"
  | "SUSPENDED"
  | "RETIRED";

export type EmployeePaymentMethodType = "BANK_TRANSFER" | "MOBILE_PAYMENT";

// ─── Etiquetas legibles ────────────────────────────────────────────────────

export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  ACTIVE: "Activo",
  ON_VACATION: "Vacaciones",
  SICK_LEAVE: "Reposo",
  SUSPENDED: "Suspendido",
  RETIRED: "Retirado",
};

export const employeeStatusClass: Record<EmployeeStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ON_VACATION: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  SICK_LEAVE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  SUSPENDED: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  RETIRED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

export const employeePaymentMethodLabel: Record<EmployeePaymentMethodType, string> = {
  BANK_TRANSFER: "Transferencia bancaria",
  MOBILE_PAYMENT: "Pago móvil",
};

// ─── Tipos de respuesta ────────────────────────────────────────────────────

export type EmployeePaymentMethodRow = {
  id: string;
  type: EmployeePaymentMethodType;
  bank: string;
  account: string | null;
  phone: string | null;
  identity: string | null;
  createdAt: string;
};

export type EmployeeSummary = {
  id: string;
  version: number;
  fullName: string;
  identity: string;
  admissionDate: string; // ISO date "YYYY-MM-DD"
  role: string | null;
  department: string | null;
  branchId: string | null;
  branchName: string | null;
  phone: string | null;
  salary: string; // Decimal serializado como string
  salaryCurrency: string;
  status: EmployeeStatus;
};

export type EmployeeDetail = EmployeeSummary & {
  birthDate: string | null;
  contractType: string | null;
  schedule: string | null;
  gender: string | null;
  address: string | null;
  foodBonus: string;
  paymentMethods: EmployeePaymentMethodRow[];
};

// ─── Tipos de entrada ──────────────────────────────────────────────────────

export type EmployeeFormData = {
  version?: number;
  fullName: string;
  identity: string;
  birthDate: string;
  admissionDate: string;
  role: string;
  department: string;
  branchId: string;
  contractType: string;
  schedule: string;
  gender: string;
  address: string;
  phone: string;
  salary: string;
  salaryCurrency: string;
  foodBonus: string;
  status: EmployeeStatus;
};

export type PaymentMethodInput = {
  type: EmployeePaymentMethodType;
  bank: string;
  account: string;
  phone: string;
  identity: string;
};

// ─── Tipos de branch para selector ────────────────────────────────────────

export type BranchOption = {
  id: string;
  name: string;
};
