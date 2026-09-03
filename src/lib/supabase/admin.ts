import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client — BYPASSES RLS. Server-only (route handlers, server
// actions). Never import this from a Client Component or expose the key
// to the browser. Use for: CSV bulk import, badge generation, cron jobs,
// scanner writes that need to look up participants across the whole event.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
