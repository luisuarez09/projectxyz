import { EmployeeProfile } from "@/components/employee-profile";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeProfile employeeId={id} />;
}
