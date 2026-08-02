import { TeamAccountDetail } from "@/components/team-account-detail";
import { TeamShell } from "@/components/team-shell";

export default async function TeamAccountDetailPage({ params }: { params: Promise<{ accountId: string; kind: string }> }) {
  const { accountId, kind } = await params;
  return <TeamShell><TeamAccountDetail accountId={accountId} kind={kind} /></TeamShell>;
}
