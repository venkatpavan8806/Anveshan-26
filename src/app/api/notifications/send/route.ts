import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deliverNotification } from "@/lib/notify";
import type { NotificationTarget, NotificationType } from "@/types/database";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = await req.json();
  const title: string = body.title;
  const message: string = body.body;
  const target: NotificationTarget = body.target ?? "ALL";
  const target_id: string | null = body.target_id ?? null;
  const type: NotificationType = body.type ?? "INFO";

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }
  if ((target === "TEAM" || target === "PARTICIPANT") && !target_id) {
    return NextResponse.json({ error: "target_id is required for TEAM/PARTICIPANT" }, { status: 400 });
  }

  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({ title, body: message, target, target_id, type })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pushResult = await deliverNotification(supabase, { title, body: message, target, target_id });

  return NextResponse.json({ notification, push: pushResult });
}
