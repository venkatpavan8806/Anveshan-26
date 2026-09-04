"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { ScheduleSlot } from "@/types/database";

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return <span className="text-emerald-400 font-semibold">It&apos;s time!</span>;

  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);

  return (
    <span className="font-mono font-semibold text-sky-400">
      {h > 0 ? `${h}h ` : ""}
      {m}m {s}s
    </span>
  );
}

export default function MySchedulePage() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", user.id).single();
    if (!profile?.team_id) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("schedule_slots")
      .select("*")
      .eq("team_id", profile.team_id)
      .order("start_time");
    setSlots(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">My Schedule</h1>
      <p className="text-slate-400 text-sm mb-6">Your team&apos;s presentation slot(s).</p>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : slots.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          Nothing scheduled yet — check back later, or make sure you&apos;re linked to a team.
        </Card>
      ) : (
        <div className="space-y-4">
          {slots.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-semibold text-white">{s.title}</h2>
                <Badge tone="indigo">{s.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-slate-400">{formatDateTime(s.start_time)} – {formatDateTime(s.end_time)}</p>
              {s.location && <p className="text-sm text-slate-400 mt-1">📍 {s.location}</p>}
              <div className="mt-3 pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-500 mr-2">Starts in</span>
                <Countdown target={s.start_time} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
