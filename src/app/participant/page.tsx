import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export default async function ParticipantHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("name, team_id").eq("id", user!.id).single();

  const { data: team } = profile?.team_id
    ? await supabase.from("teams").select("name, project_title").eq("id", profile.team_id).single()
    : { data: null };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Hi {profile?.name?.split(" ")[0] ?? "there"} 👋</h1>
      <p className="text-slate-500 mb-6">
        {team ? (
          <>
            {team.name}
            {team.project_title ? ` · ${team.project_title}` : ""}
          </>
        ) : (
          "Welcome to Anveshan"
        )}
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/participant/rules">
          <Card className="p-4 hover:border-indigo-300 transition">
            <p className="font-medium text-slate-900">📋 Rules</p>
            <p className="text-xs text-slate-500 mt-1">Guidelines & code of conduct</p>
          </Card>
        </Link>
        <Link href="/participant/arcade">
          <Card className="p-4 hover:border-indigo-300 transition">
            <p className="font-medium text-slate-900">🎮 Arcade</p>
            <p className="text-xs text-slate-500 mt-1">Kill time between sessions</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
