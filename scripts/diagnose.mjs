import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const [, , email, password] = process.argv;

const supabase = createClient(url, anonKey);

console.log("URL:", url);
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error("SIGN-IN FAILED:", signInError.message);
  process.exit(1);
}
console.log("Sign-in OK. user id:", signInData.user.id);

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", signInData.user.id)
  .single();

if (profileError) {
  console.error("PROFILE SELECT FAILED:", profileError.message, profileError.details, profileError.hint);
  process.exit(1);
}
console.log("Profile row:", profile);
