import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default async function ParticipantHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("name, team_id").eq("id", user!.id).single();

  const [{ data: nextEvent }, { data: mySlot }, { data: team }] = await Promise.all([
    supabase.from("timeline_events").select("*").gte("start_time", new Date().toISOString()).order("start_time").limit(1).maybeSingle(),
    profile?.team_id
      ? supabase
          .from("schedule_slots")
          .select("*")
          .eq("team_id", profile.team_id)
          .order("start_time")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    profile?.team_id ? supabase.from("teams").select("name, project_title").eq("id", profile.team_id).single() : Promise.resolve({ data: null }),
  ]);

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

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Up next on the timeline</p>
          {nextEvent ? (
            <>
              <p className="font-semibold text-slate-900">{nextEvent.title}</p>
              <p className="text-sm text-slate-500 mt-1">{formatDateTime(nextEvent.start_time)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">No upcoming events.</p>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Your presentation slot</p>
          {mySlot ? (
            <>
              <p className="font-semibold text-slate-900">{mySlot.title}</p>
              <p className="text-sm text-slate-500 mt-1">
                {formatDateTime(mySlot.start_time)} {mySlot.location ? `· ${mySlot.location}` : ""}
              </p>
              <Badge tone="indigo">{mySlot.status.replace("_", " ")}</Badge>
            </>
          ) : (
            <p className="text-sm text-slate-400">Not scheduled yet.</p>
          )}
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/participant/timeline">
          <Card className="p-4 hover:border-indigo-300 transition">
            <p className="font-medium text-slate-900">📅 Full Timeline</p>
            <p className="text-xs text-slate-500 mt-1">See the whole event schedule</p>
          </Card>
        </Link>
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
