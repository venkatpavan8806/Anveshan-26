// Creates a login + linked participants row for testing the participant
// side of the app. Usage:
//   node scripts/create-test-participant.mjs <email> <password> "<name>" ["<team name>"]
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const [, , email, password, name, teamName] = process.argv;
if (!email || !password || !name) {
  console.error('Usage: node scripts/create-test-participant.mjs <email> <password> "<name>" ["<team name>"]');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let teamId = null;
if (teamName) {
  const { data: team } = await supabase.from("teams").select("id").ilike("name", teamName).maybeSingle();
  if (!team) {
    console.error(`No team found named "${teamName}"`);
    process.exit(1);
  }
  teamId = team.id;
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "PARTICIPANT", name },
});
if (createError) {
  console.error("Auth user creation failed:", createError.message);
  process.exit(1);
}

if (teamId) {
  await supabase.from("profiles").update({ team_id: teamId }).eq("id", created.user.id);
}

const { data: code, error: codeError } = await supabase.rpc("next_participant_code_service");
if (codeError) {
  console.error("Code generation failed:", codeError.message);
  process.exit(1);
}

const { error: participantError } = await supabase.from("participants").insert({
  unique_code: code,
  name,
  team_id: teamId,
  qr_data: code,
  profile_id: created.user.id,
});
if (participantError) {
  console.error("Participant row failed:", participantError.message);
  process.exit(1);
}

console.log(`✓ Test contestant account created`);
console.log(`  Email: ${email}`);
console.log(`  Participant code: ${code}`);
console.log(`  Team: ${teamName ?? "(none — assign one later from Admin > Participants)"}`);
