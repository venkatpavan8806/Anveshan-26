import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/badges", label: "Badges" },
  { href: "/admin/movement", label: "Movement Log" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/rules", label: "Rules" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/arcade", label: "Arcade & Leaderboard" },
  { href: "/admin/volunteers", label: "Staff Accounts" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/");

  return (
    <AppShell title="Admin" navItems={NAV}>
      {children}
    </AppShell>
  );
}
