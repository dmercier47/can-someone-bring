// Local development only: sign in as a test host without sending an email.
//   npm run dev:login                      → test host "host@example.test", port 3000
//   npm run dev:login -- you@example.com 3001
// Prints a one-time link to open in your browser. Uses the secret key from .env.local.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "host@example.test";
const port = process.argv[3] ?? "3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Fill in .env.local first (see .env.example).");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

// Create the user if needed (already-exists errors are fine).
await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: "Test Host" } });

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Open this to sign in as ${email} (one-time, expires soon):`);
console.log(`http://localhost:${port}/auth/confirm?token_hash=${data.properties.hashed_token}&type=email&next=/dashboard`);
