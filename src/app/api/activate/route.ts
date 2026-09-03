import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Participant self-activation: they prove they hold a real badge by
// supplying its unique_code, then set an email + password. We create the
// auth user (service role) and link participants.profile_id to it.
export async function POST(req: Request) {
  const { unique_code, email, password } = await req.json();

  if (!unique_code || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const code = String(unique_code).trim().toUpperCase();

  const { data: participant, error: findError } = await admin
    .from("participants")
    .select("id, name, team_id, profile_id")
    .eq("unique_code", code)
    .maybeSingle();

  if (findError || !participant) {
    return NextResponse.json({ error: "No participant found with that code" }, { status: 404 });
  }
  if (participant.profile_id) {
    return NextResponse.json(
      { error: "This code has already been activated. Try signing in instead." },
      { status: 409 }
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "PARTICIPANT", name: participant.name },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Could not create account" }, { status: 400 });
  }

  // handle_new_user() trigger already inserted the profiles row; now link it.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ team_id: participant.team_id })
    .eq("id", created.user.id);

  const { error: linkError } = await admin
    .from("participants")
    .update({ profile_id: created.user.id })
    .eq("id", participant.id);

  if (profileError || linkError) {
    return NextResponse.json({ error: "Account created but linking failed — contact an admin." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
