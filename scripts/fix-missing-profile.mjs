// One-off: back-fills a profiles row for an auth user created before
// schema.sql (and its handle_new_user trigger) existed.
// Usage: node scripts/fix-missing-profile.mjs <email> <role: ADMIN|VOLUNTEER|PARTICIPANT> "<name>"

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const [, , email, role, name] = process.argv;
if (!email || !role || !name) {
  console.error('Usage: node scripts/fix-missing-profile.mjs <email> <ADMIN|VOLUNTEER|PARTICIPANT> "<name>"');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
if (listError) {
  console.error("Could not list users:", listError.message);
  process.exit(1);
}

const user = userList.users.find((u) => u.email === email);
if (!user) {
  console.error(`No auth user found with email ${email}`);
  process.exit(1);
}

const { error: upsertError } = await supabase
  .from("profiles")
  .upsert({ id: user.id, role, name }, { onConflict: "id" });

if (upsertError) {
  console.error("Upsert failed:", upsertError.message);
  process.exit(1);
}

console.log(`✓ profiles row set for ${email} (id: ${user.id}) — role: ${role}, name: ${name}`);
