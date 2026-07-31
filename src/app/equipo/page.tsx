import { TeamOverview } from "@/components/team-overview";
import { TeamShell } from "@/components/team-shell";

export default function TeamPage() {
  return (
    <TeamShell>
      <TeamOverview />
    </TeamShell>
  );
}
