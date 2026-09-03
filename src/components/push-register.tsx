"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push-client";

// Requests push permission once per participant (browser remembers the
// grant/deny, so this is a no-op after the first successful subscribe).
export function PushRegister({ participantId }: { participantId: string }) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof Notification === "undefined" || Notification.permission === "denied") return;

      const sub = await subscribeToPush();
      if (!sub || cancelled) return;
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      const supabase = createClient();
      await supabase.from("push_subscriptions").upsert(
        {
          participant_id: participantId,
          subscription_json: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        },
        { onConflict: "participant_id,subscription_json" }
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [participantId]);

  return null;
}
