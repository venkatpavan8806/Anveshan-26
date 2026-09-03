import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationTarget } from "@/types/database";
import { sendPushToAll } from "@/lib/push-server";

// Resolves which participants a notification targets, pushes it to their
// registered devices, and prunes subscriptions the browser has revoked.
export async function deliverNotification(
  supabase: SupabaseClient<Database>,
  args: { title: string; body: string; target: NotificationTarget; target_id: string | null; url?: string }
) {
  let participantQuery = supabase.from("participants").select("id").not("profile_id", "is", null);

  if (args.target === "TEAM" && args.target_id) {
    participantQuery = participantQuery.eq("team_id", args.target_id);
  } else if (args.target === "PARTICIPANT" && args.target_id) {
    participantQuery = participantQuery.eq("id", args.target_id);
  }

  const { data: participants } = await participantQuery;
  const participantIds = (participants ?? []).map((p) => p.id);
  if (participantIds.length === 0) return { sent: 0, recipients: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, subscription_json")
    .in("participant_id", participantIds);

  if (!subs || subs.length === 0) return { sent: 0, recipients: participantIds.length };

  const { sent, deadIds } = await sendPushToAll(
    subs as { id: string; subscription_json: { endpoint: string; keys: { p256dh: string; auth: string } } }[],
    { title: args.title, body: args.body, url: args.url ?? "/participant/notifications" }
  );

  if (deadIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadIds);
  }

  return { sent, recipients: participantIds.length };
}
