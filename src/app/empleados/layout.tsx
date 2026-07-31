import { EmployeesShell } from "@/components/employees-shell";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <EmployeesShell>{children}</EmployeesShell>;
}
