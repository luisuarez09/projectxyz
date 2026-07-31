export type EmployeeStatus = "Activo" | "Vacaciones" | "Reposo" | "Suspendido" | "Retirado";
export type SalaryCurrency = "USD" | "EUR";

export type Employee = {
  id: string;
  name: string;
  identity: string;
  birthDate: string;
  admissionDate: string;
  role: string;
  department: string;
  branch: string;
  contractType: string;
  schedule: string;
  gender: string;
  address: string;
  phone: string;
  bank: string;
  account: string;
  status: EmployeeStatus;
  salary: number;
  salaryCurrency: SalaryCurrency;
  foodBonus: number;
};

export const employeesDemo: Employee[] = [
  { id: "maria-gonzalez", name: "María González", identity: "V-18.245.631", birthDate: "1990-04-12", admissionDate: "2019-08-18", role: "Analista administrativa", department: "Administración", branch: "Casa matriz", contractType: "Tiempo indeterminado", schedule: "Lunes a viernes · 8:00 a. m. – 5:00 p. m.", gender: "Femenino", address: "Av. Las Delicias, Maracay, Aragua", phone: "0414-555-4821", bank: "Banco Nacional", account: "0102 ···· ···· 4821", status: "Activo", salary: 620, salaryCurrency: "USD", foodBonus: 55 },
  { id: "carlos-medina", name: "Carlos Medina", identity: "V-21.908.445", birthDate: "1994-11-03", admissionDate: "2021-08-27", role: "Ejecutivo de ventas", department: "Ventas", branch: "Sucursal Centro", contractType: "Tiempo indeterminado", schedule: "Lunes a sábado · horario rotativo", gender: "Masculino", address: "Urb. La Arboleda, Maracay, Aragua", phone: "0424-555-9904", bank: "Banco Mercantil", account: "0105 ···· ···· 9904", status: "Activo", salary: 560, salaryCurrency: "USD", foodBonus: 40 },
  { id: "daniela-rojas", name: "Daniela Rojas", identity: "V-16.772.904", birthDate: "1987-02-21", admissionDate: "2018-12-03", role: "Supervisora de operaciones", department: "Operaciones", branch: "Casa matriz", contractType: "Tiempo indeterminado", schedule: "Lunes a viernes · 7:30 a. m. – 4:30 p. m.", gender: "Femenino", address: "La Morita, Maracay, Aragua", phone: "0412-555-1167", bank: "Banesco", account: "0134 ···· ···· 1167", status: "Activo", salary: 690, salaryCurrency: "USD", foodBonus: 60 },
  { id: "jose-hernandez", name: "José Hernández", identity: "V-24.115.830", birthDate: "1997-07-15", admissionDate: "2024-02-12", role: "Auxiliar de almacén", department: "Almacén", branch: "Casa matriz", contractType: "Tiempo determinado", schedule: "Lunes a sábado · 8:00 a. m. – 4:00 p. m.", gender: "Masculino", address: "San Jacinto, Maracay, Aragua", phone: "0416-555-3012", bank: "Banco de Venezuela", account: "0102 ···· ···· 3012", status: "Reposo", salary: 480, salaryCurrency: "USD", foodBonus: 40 },
  { id: "ana-perez", name: "Ana Pérez", identity: "V-20.384.116", birthDate: "1992-09-28", admissionDate: "2022-06-06", role: "Asistente contable", department: "Administración", branch: "Casa matriz", contractType: "Tiempo indeterminado", schedule: "Lunes a viernes · 8:00 a. m. – 5:00 p. m.", gender: "Femenino", address: "Caña de Azúcar, Maracay, Aragua", phone: "0426-555-7720", bank: "Banco Provincial", account: "0108 ···· ···· 7720", status: "Vacaciones", salary: 530, salaryCurrency: "USD", foodBonus: 45 },
  { id: "ramon-suarez", name: "Ramón Suárez", identity: "V-14.508.291", birthDate: "1983-01-10", admissionDate: "2016-03-14", role: "Coordinador de despacho", department: "Operaciones", branch: "Sucursal Centro", contractType: "Tiempo indeterminado", schedule: "Lunes a sábado · 7:00 a. m. – 3:00 p. m.", gender: "Masculino", address: "El Limón, Maracay, Aragua", phone: "0414-555-6502", bank: "Banco Nacional de Crédito", account: "0191 ···· ···· 6502", status: "Retirado", salary: 640, salaryCurrency: "USD", foodBonus: 50 },
];

export const employeeStatusClass: Record<EmployeeStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  Vacaciones: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Reposo: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Suspendido: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  Retirado: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

export function money(value: number, currency = "Bs") {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + ` ${currency}`;
}
