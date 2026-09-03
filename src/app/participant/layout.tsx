import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { NotificationBell } from "@/components/notification-bell";
import { PushRegister } from "@/components/push-register";

const NAV = [
  { href: "/participant", label: "Home" },
  { href: "/participant/timeline", label: "Timeline" },
  { href: "/participant/rules", label: "Rules" },
  { href: "/participant/schedule", label: "My Schedule" },
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
      <div className="hidden lg:flex justify-end -mt-4 mb-2">
        {participant && <NotificationBell participantId={participant.id} />}
      </div>
      {children}
    </AppShell>
  );
}
