import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface MergedItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  kind: "EVENT" | "PRESENTATION";
  location?: string | null;
  teamName?: string | null;
}

export default async function ParticipantTimelinePage() {
  const supabase = await createClient();

  const [{ data: events }, { data: slots }] = await Promise.all([
    supabase.from("timeline_events").select("*").order("start_time"),
    supabase.from("schedule_slots").select("*, teams(name)").order("start_time"),
  ]);

  const merged: MergedItem[] = [
    ...(events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start_time: e.start_time,
      end_time: e.end_time,
      kind: "EVENT" as const,
    })),
    ...(slots ?? []).map((s) => ({
      id: s.id,
      title: `${s.title} — ${(s as unknown as { teams: { name: string } | null }).teams?.name ?? "Team"}`,
      description: null,
      start_time: s.start_time,
      end_time: s.end_time,
      kind: "PRESENTATION" as const,
      location: s.location,
    })),
  ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const now = Date.now();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Event Timeline</h1>
      <p className="text-slate-400 text-sm mb-6">The full schedule — general events and every team&apos;s presentation slot.</p>

      <div className="relative border-l-2 border-slate-800 ml-3">
        {merged.map((item) => {
          const isPast = new Date(item.end_time ?? item.start_time).getTime() < now;
          return (
            <div key={item.id} className="mb-5 ml-6 relative">
              <span
                className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                  isPast ? "bg-slate-700" : item.kind === "PRESENTATION" ? "bg-sky-500" : "bg-emerald-500"
                }`}
              />
              <Card className={`p-4 ${isPast ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    {item.description && <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>}
                    {item.location && <p className="text-xs text-slate-500 mt-1">📍 {item.location}</p>}
                  </div>
                  <Badge tone={item.kind === "PRESENTATION" ? "indigo" : "green"}>
                    {item.kind === "PRESENTATION" ? "Presentation" : "Event"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {formatDateTime(item.start_time)}
                  {item.end_time ? ` – ${formatDateTime(item.end_time)}` : ""}
                </p>
              </Card>
            </div>
          );
        })}
        {merged.length === 0 && <p className="text-sm text-slate-500 ml-6">Nothing on the schedule yet.</p>}
      </div>
    </div>
  );
}
