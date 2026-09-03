import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

const NAV = [{ href: "/volunteer/scan", label: "Scanner" }];

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["VOLUNTEER", "ADMIN"].includes(profile.role)) redirect("/");

  return (
    <AppShell title="Volunteer" navItems={NAV}>
      {children}
    </AppShell>
  );
}
