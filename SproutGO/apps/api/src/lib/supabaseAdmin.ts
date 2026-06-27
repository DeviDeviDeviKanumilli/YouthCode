// Supabase admin client (service-role). Backend only — bypasses RLS, so the API
// layer is the real auth boundary (TECH_RISKS R3). Used for Storage path checks and
// any admin-scoped operations. NEVER expose the service-role key to the client.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}
