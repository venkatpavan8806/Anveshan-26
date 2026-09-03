import "server-only";
import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface StoredSubscription {
  id: string;
  subscription_json: { endpoint: string; keys: { p256dh: string; auth: string } };
}

// Sends to every subscription; returns ids of subscriptions that are dead
// (410/404 — the browser unsubscribed) so the caller can prune them.
export async function sendPushToAll(subs: StoredSubscription[], payload: PushPayload) {
  ensureConfigured();
  const deadIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription_json, JSON.stringify(payload));
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) deadIds.push(sub.id);
      }
    })
  );

  return { sent, deadIds };
}
