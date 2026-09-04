"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ participantId }: { participantId: string }) {
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase.from("notifications").select("id"),
      supabase.from("notification_reads").select("notification_id").eq("participant_id", participantId),
    ]);
    const readIds = new Set((reads ?? []).map((r) => r.notification_id));
    setUnread((notifs ?? []).filter((n) => !readIds.has(n.id)).length);
  }, [participantId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`participant-bell-${participantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <Link href="/participant/notifications" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-800 transition">
      <span aria-hidden className="text-lg">
        🔔
      </span>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
