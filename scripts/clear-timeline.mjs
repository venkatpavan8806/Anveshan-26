import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { error, count } = await supabase.from("timeline_events").delete({ count: "exact" }).not("id", "is", null);
if (error) console.error("Failed:", error.message);
else console.log(`✓ Deleted ${count} timeline events`);
