// Imports scripts/teams-parsed.json (produced by parse-teams-docx.mjs) into
// Supabase: one row per team in `teams`, one row per member in
// `participants` (auto-generated ANV-xxxx codes), linked by team_id.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const teams = JSON.parse(await readFile(new URL("./teams-parsed.json", import.meta.url), "utf-8"));

let teamsCreated = 0;
let participantsCreated = 0;
const failed = [];

for (const team of teams) {
  const { data: existingTeam } = await supabase.from("teams").select("id").ilike("name", team.name).maybeSingle();

  let teamId = existingTeam?.id;
  if (!teamId) {
    const { data: newTeam, error: teamError } = await supabase
      .from("teams")
      .insert({ name: team.name })
      .select("id")
      .single();
    if (teamError) {
      failed.push(`[team] ${team.name}: ${teamError.message}`);
      continue;
    }
    teamId = newTeam.id;
    teamsCreated++;
  }

  for (const member of team.members) {
    const { data: code, error: codeError } = await supabase.rpc("next_participant_code_service");
    if (codeError) {
      failed.push(`[code] ${team.name} / ${member}: ${codeError.message}`);
      continue;
    }
    const { error: insertError } = await supabase.from("participants").insert({
      unique_code: code,
      name: member,
      team_id: teamId,
      qr_data: code,
    });
    if (insertError) {
      failed.push(`[participant] ${team.name} / ${member}: ${insertError.message}`);
      continue;
    }
    participantsCreated++;
  }
}

console.log(`\nTeams created: ${teamsCreated} (of ${teams.length} — rest already existed)`);
console.log(`Participants created: ${participantsCreated}`);
if (failed.length) {
  console.log(`\nFailed (${failed.length}):`);
  failed.forEach((f) => console.log("  ✗", f));
}
