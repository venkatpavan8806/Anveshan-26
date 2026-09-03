import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverNotification } from "@/lib/notify";

// Vercel Cron hits this on a schedule (see vercel.json). It runs with no
// user session, so it uses the service-role client directly — that's safe
// here because the route itself is gated by CRON_SECRET below.
//
// Two auto-transitions, each guarded by the slot's own status so a slot is
// only ever notified once per stage:
//   UPCOMING   -> READY_CALL   (15 min before start): "get ready" ping
//   READY_CALL -> IN_PROGRESS  (at/after start time): "you're up" ping
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);

  const results: { slot: string; type: string; sent: number }[] = [];

  const { data: readySlots } = await supabase
    .from("schedule_slots")
    .select("*, teams(name)")
    .eq("status", "UPCOMING")
    .lte("start_time", in15.toISOString());

  for (const slot of readySlots ?? []) {
    const teamName = (slot as unknown as { teams: { name: string } | null }).teams?.name ?? "Your team";
    const title = "Get ready!";
    const body = `${teamName}, you present in about 15 minutes${slot.location ? ` at ${slot.location}` : ""}.`;

    await supabase.from("notifications").insert({ title, body, target: "TEAM", target_id: slot.team_id, type: "READY_CALL" });
    const push = await deliverNotification(supabase, { title, body, target: "TEAM", target_id: slot.team_id });
    await supabase.from("schedule_slots").update({ status: "READY_CALL" }).eq("id", slot.id);

    results.push({ slot: slot.id, type: "READY_CALL", sent: push.sent });
  }

  const { data: startingSlots } = await supabase
    .from("schedule_slots")
    .select("*, teams(name)")
    .eq("status", "READY_CALL")
    .lte("start_time", now.toISOString());

  for (const slot of startingSlots ?? []) {
    const teamName = (slot as unknown as { teams: { name: string } | null }).teams?.name ?? "Your team";
    const title = "You're up!";
    const body = `${teamName}, it's presentation time${slot.location ? ` at ${slot.location}` : ""}.`;

    await supabase
      .from("notifications")
      .insert({ title, body, target: "TEAM", target_id: slot.team_id, type: "PRESENTATION_TIME" });
    const push = await deliverNotification(supabase, { title, body, target: "TEAM", target_id: slot.team_id });
    await supabase.from("schedule_slots").update({ status: "IN_PROGRESS" }).eq("id", slot.id);

    results.push({ slot: slot.id, type: "PRESENTATION_TIME", sent: push.sent });
  }

  return NextResponse.json({ ok: true, checked_at: now.toISOString(), results });
}
