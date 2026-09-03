import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

for (const status of ["PENDING", "IN", "OUT"]) {
  const { count, error } = await supabase.from("participants").select("*", { count: "exact", head: true }).eq("status", status);
  if (error) console.log(status, "ERROR:", error.message);
  else console.log(status, "=", count);
}
