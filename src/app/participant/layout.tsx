import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { NotificationBell } from "@/components/notification-bell";
import { PushRegister } from "@/components/push-register";

const NAV = [
  { href: "/participant", label: "Home" },
  { href: "/participant/rules", label: "Rules" },
  { href: "/participant/notifications", label: "Notifications" },
  { href: "/participant/arcade", label: "Arcade" },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "PARTICIPANT") redirect("/");

  const { data: participant } = await supabase.from("participants").select("id").eq("profile_id", user.id).maybeSingle();

  return (
    <AppShell title="Participant" navItems={NAV} headerExtra={participant && <NotificationBell participantId={participant.id} />}>
      {participant && <PushRegister participantId={participant.id} />}
      {children}
    </AppShell>
  );
}
