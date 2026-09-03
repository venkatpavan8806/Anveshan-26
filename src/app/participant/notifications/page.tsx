"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types/database";

export default function ParticipantNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: participant } = await supabase.from("participants").select("id").eq("profile_id", user.id).maybeSingle();
    if (!participant) {
      setLoading(false);
      return;
    }

    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase.from("notifications").select("*").order("sent_at", { ascending: false }),
      supabase.from("notification_reads").select("notification_id").eq("participant_id", participant.id),
    ]);

    setNotifications(notifs ?? []);
    const already = new Set((reads ?? []).map((r) => r.notification_id));
    setReadIds(already);
    setLoading(false);

    const unread = (notifs ?? []).filter((n) => !already.has(n.id));
    if (unread.length > 0) {
      await supabase.from("notification_reads").upsert(
        unread.map((n) => ({ notification_id: n.id, participant_id: participant.id })),
        { onConflict: "notification_id,participant_id" }
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Notifications</h1>
      <p className="text-slate-500 text-sm mb-6">Announcements sent to you, your team, or everyone.</p>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : notifications.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-400">No notifications yet.</Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`p-4 ${!readIds.has(n.id) ? "border-indigo-300 bg-indigo-50/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                </div>
                <Badge tone={n.type === "PRESENTATION_TIME" ? "indigo" : n.type === "READY_CALL" ? "amber" : "default"}>
                  {n.type.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">{formatDateTime(n.sent_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
