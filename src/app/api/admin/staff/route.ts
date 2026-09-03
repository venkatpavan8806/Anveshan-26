import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Creates a VOLUNTEER or ADMIN login. Needs the service role because
// regular users can never call supabase.auth.admin.* — that's the whole
// point of the service role being server-only.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { email, password, name, role } = await req.json();
  if (!email || !password || !name || !["ADMIN", "VOLUNTEER"].includes(role)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, name },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not create account" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.user.id });
}
