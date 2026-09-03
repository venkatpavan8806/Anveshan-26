#!/usr/bin/env node
// One-time bootstrap: creates your first ADMIN account. After that, use
// the "Staff Accounts" page in the app (as that admin) to add more
// admins/volunteers.
//
// Usage:
//   node scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const [, , email, password, name] = process.argv;
if (!email || !password || !name) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> "<name>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "ADMIN", name },
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log(`✓ Admin account created for ${email} (id: ${data.user.id})`);
console.log("Sign in at /login with this email and password.");
