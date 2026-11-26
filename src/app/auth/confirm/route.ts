import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function safeNext(next: string | null) {
  // Only allow same-site paths, never an external URL.
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

// Magic link lands here. Supports both link styles:
//   ?token_hash=…&type=email  (works even if the link opens in a different browser, e.g. the Mail app)
//   ?code=…                   (Supabase's default PKCE link; must open in the same browser)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const supabase = await supabaseServer();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/login?error=link", origin));
}
