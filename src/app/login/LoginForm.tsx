"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendLink, verifyCode, type LoginState } from "./actions";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";

/**
 * Length of Supabase's email code (Supabase → Auth → Sign In / Providers → Email → "Email OTP Length").
 * Used to auto-submit; the server accepts 6–10 digits either way.
 */
const OTP_LENGTH = 8;

export default function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [sendState, send, sending] = useActionState<LoginState, FormData>(sendLink, { step: "email" });
  // Lets the host go back and fix a mistyped email after a code was sent.
  const [editingEmail, setEditingEmail] = useState(false);

  useEffect(() => {
    if (sendState.step === "sent") setEditingEmail(false);
  }, [sendState]);

  if (sendState.step === "sent" && !editingEmail && sendState.email) {
    return <CodeStep email={sendState.email} next={next} onChangeEmail={() => setEditingEmail(true)} />;
  }

  return (
    <div>
      <Sticker name="plate" size={64} />
      <h1 className="mt-3 font-display tracking-[-0.015em] text-[36px] leading-[1.05]">Host a party</h1>
      <p className="mt-3 text-[17px] text-muted">
        Enter your email and we&apos;ll send you a sign-in code. No password to remember.
      </p>
      {linkError && (
        <p className="mt-4 rounded-2xl bg-cat-yellow px-4 py-3 text-sm text-cat-ink">
          That sign-in link expired or was already used. Send yourself a new code.
        </p>
      )}
      <form action={send} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className={ui.label}>Email</span>
          <input
            name="email"
            type="email"
            className={ui.input}
            defaultValue={sendState.email}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            enterKeyHint="send"
            required
          />
        </label>
        {sendState.error && <p className="text-[14px] text-accent">{sendState.error}</p>}
        <button className={`${ui.pill} w-full`} disabled={sending}>
          {sending ? "Sending…" : "Email me a code"}
        </button>
      </form>
    </div>
  );
}

function CodeStep({ email, next, onChangeEmail }: { email: string; next: string; onChangeEmail: () => void }) {
  const [codeState, verify, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "sent" });
  const [, resend, resending] = useActionState<LoginState, FormData>(sendLink, { step: "sent" });
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedFor = useRef<string | null>(null);

  // After a wrong code, clear the box and put the cursor back so they can try again.
  useEffect(() => {
    if (!codeState.error) return;
    setCode("");
    submittedFor.current = null;
    inputRef.current?.focus();
  }, [codeState]);

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    const jumped = digits.length - code.length > 1; // autofill or paste, not typing
    setCode(digits);
    // Sign in as soon as the full code is there: typed, pasted, or filled in by the OS.
    const complete = digits.length === OTP_LENGTH || (jumped && digits.length >= 6);
    if (complete && submittedFor.current !== digits && !verifying) {
      submittedFor.current = digits;
      // Let React commit the new value before the form reads it.
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  }

  return (
    <div>
      <Sticker name="party" size={64} />
      <h1 className="mt-3 font-display tracking-[-0.015em] text-[36px] leading-[1.05]">Enter your code</h1>
      <p className="mt-3 text-[17px] text-muted">
        We emailed a sign-in code to
        <b className="block break-words text-ink">{email}</b>
      </p>

      <form ref={formRef} action={verify} className="mt-7 space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="sr-only">Sign-in code</span>
          <input
            ref={inputRef}
            name="code"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            // Lets iOS/macOS Safari and Chrome offer the code from Mail or Messages above the keyboard.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="go"
            autoFocus
            maxLength={10}
            placeholder={"•".repeat(OTP_LENGTH)}
            aria-invalid={Boolean(codeState.error)}
            className="h-20 w-full rounded-[20px] border border-hair bg-surface px-4 text-center text-[32px] tracking-[0.3em] tabular-nums outline-none placeholder:text-line focus:border-ink focus:ring-1 focus:ring-ink aria-[invalid=true]:border-accent"
          />
        </label>
        {codeState.error && <p className="text-[14px] text-accent">{codeState.error}</p>}
        <button className={`${ui.pill} w-full`} disabled={verifying || code.length < 6}>
          {verifying ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">Or tap the Sign in button in the email.</p>

      <div className="mt-2 flex items-center justify-center gap-2 text-[14px] text-muted">
        <form action={resend} onSubmit={() => setResent(true)}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <button className="h-11 px-2 underline underline-offset-2" disabled={resending}>
            {resending ? "Sending…" : resent ? "Sent! Send again" : "Send a new code"}
          </button>
        </form>
        <span aria-hidden>·</span>
        <button type="button" onClick={onChangeEmail} className="h-11 px-2 underline underline-offset-2">
          Use a different email
        </button>
      </div>
    </div>
  );
}
