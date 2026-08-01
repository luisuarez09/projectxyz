import { PayrollPeriodDetail } from "@/components/payroll-period-detail";

export default async function PayrollPeriodPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  return <PayrollPeriodDetail periodId={period} />;
}
