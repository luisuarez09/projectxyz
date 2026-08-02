import { FiscalMatrix } from "@/components/fiscal-matrix";

export default async function MatrixTvPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  return <FiscalMatrix initialPeriod={period} tv />;
}
