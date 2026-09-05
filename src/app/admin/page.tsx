"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Stat, Card, Badge } from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/utils";

const THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes

interface OutRow {
  participant_id: string;
  name: string;
  unique_code: string;
  photo_url: string | null;
  checked_out_at: string;
  gate_label: string | null;
  reason: string | null;
}

interface LogRow {
  id: string;
  action: "CHECK_IN" | "CHECK_OUT";
  timestamp: string;
  gate_label: string | null;
  reason: string | null;
  participants: { name: string; unique_code: string } | null;
}

export default function AdminDashboard() {
  const [totals, setTotals] = useState({ total: 0, in: 0, out: 0, pending: 0 });
  const [outRows, setOutRows] = useState<OutRow[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();

    const [{ count: total }, { count: inCount }, { count: outCount }, { count: pendingCount }, { data: out }, { data: logs }] =
      await Promise.all([
        supabase.from("participants").select("*", { count: "exact", head: true }),
        supabase.from("participants").select("*", { count: "exact", head: true }).eq("status", "IN"),
        supabase.from("participants").select("*", { count: "exact", head: true }).eq("status", "OUT"),
        supabase.from("participants").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("v_currently_out").select("*").order("checked_out_at", { ascending: true }),
        supabase
          .from("movement_logs")
          .select("id, action, timestamp, gate_label, reason, participants(name, unique_code)")
          .order("timestamp", { ascending: false })
          .limit(20),
      ]);

    setTotals({ total: total ?? 0, in: inCount ?? 0, out: outCount ?? 0, pending: pendingCount ?? 0 });
    setOutRows((out as OutRow[]) ?? []);
    setRecentLogs((logs as unknown as LogRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "movement_logs" }, load)
      .subscribe();

    const tick = setInterval(() => setNow(Date.now()), 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, [load]);

  const overThreshold = outRows.filter((r) => now - new Date(r.checked_out_at).getTime() > THRESHOLD_MS);

  return (
    <div>
      <PageHeader
        title="Live Dashboard"
        description="Real-time view of who's on-site right now."
        action={
          <Link href="/admin/movement" className="text-sm text-sky-400 hover:underline font-medium">
            Full movement log →
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="Total Participants" value={totals.total} />
        <Stat label="Not Arrived" value={totals.pending} />
        <Stat label="Currently In" value={totals.in} tone="green" />
        <Stat label="Currently Out" value={totals.out} tone={totals.out > 0 ? "amber" : "default"} />
        <Stat label="Out > 60 min" value={overThreshold.length} tone={overThreshold.length > 0 ? "red" : "default"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-white mb-3">Currently Outside</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : outRows.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody is currently outside.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {outRows.map((r) => {
                const durationMs = now - new Date(r.checked_out_at).getTime();
                const over = durationMs > THRESHOLD_MS;
                return (
                  <li key={r.participant_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.unique_code} · left {formatTime(r.checked_out_at)}
                        {r.gate_label ? ` · ${r.gate_label}` : ""}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </p>
                    </div>
                    <Badge tone={over ? "red" : "amber"}>{formatDuration(durationMs)}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-white mb-3">Recent Activity</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No movement yet.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {recentLogs.map((log) => (
                <li key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{log.participants?.name ?? "—"}</p>
                    <p className="text-xs text-slate-400">
                      {log.participants?.unique_code} {log.gate_label ? `· ${log.gate_label}` : ""}
                      {log.reason ? ` · ${log.reason}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge tone={log.action === "CHECK_IN" ? "green" : "amber"}>
                      {log.action === "CHECK_IN" ? "IN" : "OUT"}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-0.5">{formatTime(log.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
