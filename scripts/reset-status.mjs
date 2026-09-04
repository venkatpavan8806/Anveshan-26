import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { error, count } = await supabase
  .from("participants")
  .update({ status: "PENDING" }, { count: "exact" })
  .neq("status", "PENDING");

console.log(error ? `✗ ${error.message}` : `✓ reset ${count} participant(s) back to PENDING`);
