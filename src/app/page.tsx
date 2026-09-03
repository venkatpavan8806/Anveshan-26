import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  VOLUNTEER: "/volunteer/scan",
  PARTICIPANT: "/participant",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  redirect(profile?.role ? ROLE_HOME[profile.role] ?? "/login" : "/login");
}
