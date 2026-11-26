// Local development only: sign in without sending an email (no rate limit).
//   npm run dev:login                                            → test host, http://localhost:3000
//   npm run dev:login -- you@example.com 3001                    → you, http://localhost:3001
//   npm run dev:login -- you@example.com http://macbook-air.local:3001   → a link to open on your phone
// Prints a one-time link. Uses the secret key from .env.local.
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import qrcode from "qrcode-terminal";

const email = process.argv[2] ?? "host@example.test";
const target = process.argv[3] ?? "3000";
const origin = target.includes("://") ? target.replace(/\/+$/, "") : `http://localhost:${target}`;
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
const link = `${origin}/auth/confirm?type=email&next=/dashboard&token_hash=${data.properties.hashed_token}`;

// Copy to the clipboard (macOS). With the same Apple ID, Universal Clipboard lets you paste it on an iPhone.
let copied = false;
try {
  execFileSync("pbcopy", { input: link });
  copied = true;
} catch {}

console.log(`\nSign in as ${email} (one-time link, expires in about an hour):\n`);
if (!origin.includes("localhost")) {
  console.log("Scan with your phone's camera:\n");
  qrcode.generate(link, { small: true });
}
console.log(`\n${link}\n`);
if (copied) console.log("✓ Copied to clipboard. Copying from the terminal can cut long links short, so paste this instead.\n");
