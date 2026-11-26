import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the secret key. Bypasses Row Level Security,
 * so every caller must validate input and never return secrets (edit tokens, emails)
 * to other guests. Never import this from a client component.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || url.includes("YOUR-") || key.includes("YOUR-")) {
    throw new Error("Supabase isn't configured: fill in .env.local (see .env.example).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
