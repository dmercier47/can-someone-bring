import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // Relative Location keeps the visitor on the address they used (request.nextUrl.origin is
  // "localhost" in route handlers, which breaks when testing from a phone).
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
