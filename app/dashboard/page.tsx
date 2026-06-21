import { Console } from "@/components/dashboard/Console";
import { requireViewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Console — Sentinel" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  return <Console viewer={viewer ? { name: viewer.fullName || viewer.email, orgName: viewer.orgName } : null} />;
}
