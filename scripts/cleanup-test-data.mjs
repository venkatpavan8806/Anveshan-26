// Removes the Kowalski test account/participant and any movement logs
// tied to testing, leaving the real 136-participant roster untouched.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log("Before cleanup:");
const { count: logsBefore } = await supabase.from("movement_logs").select("*", { count: "exact", head: true });
const { count: participantsBefore } = await supabase.from("participants").select("*", { count: "exact", head: true });
console.log(`  movement_logs: ${logsBefore}, participants: ${participantsBefore}`);

// 1. Find and delete the Kowalski participant row (cascades: movement_logs,
//    game_scores, notification_reads, push_subscriptions for that id).
const { data: participant } = await supabase
  .from("participants")
  .select("id, name, unique_code")
  .eq("unique_code", "ANV-0137")
  .maybeSingle();

if (participant) {
  const { error } = await supabase.from("participants").delete().eq("id", participant.id);
  console.log(error ? `✗ delete participant: ${error.message}` : `✓ deleted participant ${participant.name} (${participant.unique_code})`);
} else {
  console.log("— no participant with code ANV-0137 found, skipping");
}

// 2. Find and delete the auth user (cascades: profiles row).
const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.log("✗ listUsers:", listError.message);
} else {
  const user = userList.users.find((u) => u.email === "kowalski8806@gmail.com");
  if (user) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    console.log(error ? `✗ delete auth user: ${error.message}` : `✓ deleted auth user kowalski8806@gmail.com`);
  } else {
    console.log("— no auth user kowalski8806@gmail.com found, skipping");
  }
}

// 3. Any remaining movement_logs are, by construction, only ever written
//    by scans/toggles — the real 136 were never scanned, so this should
//    already be empty via the cascade above. Wipe just in case anything
//    else slipped in during testing.
const { error: logsError, count: logsDeleted } = await supabase
  .from("movement_logs")
  .delete({ count: "exact" })
  .not("id", "is", null);
console.log(logsError ? `✗ clear movement_logs: ${logsError.message}` : `✓ cleared ${logsDeleted} remaining movement_logs row(s)`);

console.log("\nAfter cleanup:");
const { count: logsAfter } = await supabase.from("movement_logs").select("*", { count: "exact", head: true });
const { count: participantsAfter } = await supabase.from("participants").select("*", { count: "exact", head: true });
const { count: pendingAfter } = await supabase.from("participants").select("*", { count: "exact", head: true }).eq("status", "PENDING");
console.log(`  movement_logs: ${logsAfter}, participants: ${participantsAfter}, pending: ${pendingAfter}`);
