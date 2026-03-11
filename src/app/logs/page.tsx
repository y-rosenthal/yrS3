import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SystemLogView } from "@/components/SystemLogView";

export default async function LogsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50">
      <SystemLogView />
    </div>
  );
}
