"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "sent"; email?: string; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function sendLink(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!EMAIL.test(email)) return { step: "email", email, error: "That email doesn't look right." };

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });

  if (error) {
    const msg = error.message.toLowerCase().includes("rate")
      ? "Too many emails sent. Wait a minute and try again."
      : "Couldn't send the email. Try again?";
    return { step: "email", email, error: msg };
  }
  return { step: "sent", email };
}

export async function verifyCode(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  const next = safeNext(form.get("next"));
  if (token.length < 6) return { step: "sent", email, error: "Enter the code from the email." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "sent", email, error: "That code didn't work. Check it, or send a new one." };
  redirect(next);
}
