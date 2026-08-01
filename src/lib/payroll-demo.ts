import { employeesDemo, type Employee } from "@/lib/employees-demo";

export type PayrollPeriodStatus = "Abierta" | "Cerrada";
export type PayrollCutStatus = "Borrador" | "Pagada";

export type PayrollCut = {
  id: "q1" | "q2" | "month";
  label: string;
  paymentDate: string;
  status: PayrollCutStatus;
  rate: number;
};

export type PayrollPeriod = {
  id: string;
  label: string;
  status: PayrollPeriodStatus;
  frequency: "Quincenal" | "Mensual";
  currency: "USD" | "EUR";
  rateSource: string;
  cuts: PayrollCut[];
};

export type PayrollPayment = {
  employee: Employee;
  cuts: Record<string, {
    salary: number;
    food: number;
    ivss: number;
    faov: number;
    absence: number;
    assignments: number;
    deductions: number;
    net: number;
  }>;
  total: number;
};

const activeEmployees = employeesDemo.filter((employee) => employee.status !== "Retirado" && employee.status !== "Suspendido");

export const payrollPeriods: PayrollPeriod[] = [
  {
    id: "2026-07",
    label: "Julio 2026",
    status: "Abierta",
    frequency: "Quincenal",
    currency: "USD",
    rateSource: "Tasa propia de la empresa",
    cuts: [
      { id: "q1", label: "1.ª quincena", paymentDate: "15 jul 2026", status: "Pagada", rate: 47.5 },
      { id: "q2", label: "2.ª quincena", paymentDate: "31 jul 2026", status: "Borrador", rate: 47.5 },
    ],
  },
  {
    id: "2026-06",
    label: "Junio 2026",
    status: "Cerrada",
    frequency: "Quincenal",
    currency: "USD",
    rateSource: "Tasa propia de la empresa",
    cuts: [
      { id: "q1", label: "1.ª quincena", paymentDate: "14 jun 2026", status: "Pagada", rate: 46.8 },
      { id: "q2", label: "2.ª quincena", paymentDate: "30 jun 2026", status: "Pagada", rate: 47.1 },
    ],
  },
  {
    id: "2026-05",
    label: "Mayo 2026",
    status: "Cerrada",
    frequency: "Quincenal",
    currency: "USD",
    rateSource: "Tasa propia de la empresa",
    cuts: [
      { id: "q1", label: "1.ª quincena", paymentDate: "15 may 2026", status: "Pagada", rate: 45.9 },
      { id: "q2", label: "2.ª quincena", paymentDate: "30 may 2026", status: "Pagada", rate: 46.2 },
    ],
  },
  {
    id: "2026-04",
    label: "Abril 2026",
    status: "Cerrada",
    frequency: "Quincenal",
    currency: "USD",
    rateSource: "Tasa propia de la empresa",
    cuts: [
      { id: "q1", label: "1.ª quincena", paymentDate: "15 abr 2026", status: "Pagada", rate: 44.8 },
      { id: "q2", label: "2.ª quincena", paymentDate: "30 abr 2026", status: "Pagada", rate: 45.2 },
    ],
  },
];

export function getPayrollPeriod(id: string) {
  return payrollPeriods.find((period) => period.id === id);
}

export function getPayrollPayments(period: PayrollPeriod): PayrollPayment[] {
  return activeEmployees.map((employee, employeeIndex) => {
    const cuts = Object.fromEntries(period.cuts.map((cut, cutIndex) => {
      const fraction = period.frequency === "Quincenal" ? 0.5 : 1;
      const salary = employee.salary * fraction * cut.rate;
      const food = employee.foodBonus * fraction * cut.rate;
      const absenceDays = period.id === "2026-07" && cutIndex === 1 && employeeIndex === 1 ? 1 : 0;
      const absence = employee.salary / 30 * absenceDays * cut.rate;
      const ivss = salary * 0.04;
      const faov = salary * 0.01;
      const assignments = salary + food;
      const deductions = ivss + faov + absence;
      return [cut.id, { salary, food, ivss, faov, absence, assignments, deductions, net: assignments - deductions }];
    }));
    return { employee, cuts, total: Object.values(cuts).reduce((total, cut) => total + cut.net, 0) };
  });
}

export function getPayrollTotals(period: PayrollPeriod) {
  const payments = getPayrollPayments(period);
  const byCut = Object.fromEntries(period.cuts.map((cut) => [cut.id, payments.reduce((total, payment) => total + payment.cuts[cut.id].net, 0)]));
  const total = payments.reduce((sum, payment) => sum + payment.total, 0);
  const paid = period.cuts.reduce((sum, cut) => sum + (cut.status === "Pagada" ? byCut[cut.id] : 0), 0);
  return { byCut, total, paid, pending: total - paid, employeeCount: payments.length };
}
