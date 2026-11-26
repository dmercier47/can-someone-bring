"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { NEXT_COOKIE, safeNext } from "@/lib/auth-redirect";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * Finishes sign-in. Runs as a POST from the confirm page (never on a plain GET), so link
 * previews and email scanners that fetch the URL can't use up the one-time link.
 * `redirect()` here is relative, so the visitor stays on the address they came from.
 */
export async function confirmSignIn(form: FormData) {
  const tokenHash = String(form.get("token_hash") ?? "");
  const typeRaw = String(form.get("type") ?? "");
  const code = String(form.get("code") ?? "");
  const cookieStore = await cookies();
  const next = safeNext(String(form.get("next") ?? "") || cookieStore.get(NEXT_COOKIE)?.value);

  const supabase = await supabaseServer();
  let ok = false;
  if (tokenHash && OTP_TYPES.includes(typeRaw as EmailOtpType)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: typeRaw as EmailOtpType })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  cookieStore.delete(NEXT_COOKIE);
  redirect(ok ? next : "/login?error=link");
}
