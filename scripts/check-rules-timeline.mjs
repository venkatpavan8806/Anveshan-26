import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: rules } = await supabase.from("rules").select("id, section_title, order_index").order("order_index");
console.log("rules:", rules);

const { data: timeline } = await supabase.from("timeline_events").select("id, title").order("order_index");
console.log("timeline_events:", timeline);

const { data: slots } = await supabase.from("schedule_slots").select("id, title").order("start_time");
console.log("schedule_slots:", slots);
