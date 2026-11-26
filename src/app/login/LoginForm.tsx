"use client";

import { useActionState } from "react";
import { sendLink, verifyCode, type LoginState } from "./actions";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";

export default function LoginForm({
  next,
  linkError,
}: {
  next: string;
  linkError: boolean;
}) {
  const [sendState, send, sending] = useActionState<LoginState, FormData>(
    sendLink,
    { step: "email" },
  );
  const [codeState, verify, verifying] = useActionState<LoginState, FormData>(
    verifyCode,
    { step: "sent" },
  );
  const [, resend, resending] = useActionState<LoginState, FormData>(sendLink, {
    step: "sent",
  });

  if (sendState.step === "sent") {
    return (
      <div>
        <Sticker name="party" size={64} />
        <h1 className="mt-3 text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em]">
          Check your email
        </h1>
        <p className="mt-3 text-[17px] text-muted">
          We sent a sign-in link to{" "}
          <b className="text-ink">{sendState.email}</b>. Open it in this browser
          to sign in.
        </p>
        {/* Only useful once the email template includes {{ .Token }} (needs custom SMTP, e.g. Resend). */}
        <details className="mt-8" open={Boolean(codeState.error)}>
          <summary className="cursor-pointer py-2 text-sm font-semibold text-muted">
            Got a 6-digit code instead?
          </summary>
          <form action={verify} className="mt-3 space-y-4">
            <input type="hidden" name="email" value={sendState.email} />
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className={ui.label}>6-digit code</span>
              <input
                name="code"
                className={`${ui.input} text-center text-2xl font-bold tracking-[0.4em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="••••••"
              />
            </label>
            {codeState.error && (
              <p className="text-sm font-semibold text-accent">
                {codeState.error}
              </p>
            )}
            <button className={`${ui.pill} w-full`} disabled={verifying}>
              {verifying ? "Checking…" : "Sign in"}
            </button>
          </form>
        </details>
        <form action={resend} className="mt-4 text-center">
          <input type="hidden" name="email" value={sendState.email} />
          <input type="hidden" name="next" value={next} />
          <button
            className="h-11 text-sm font-semibold text-muted underline underline-offset-2"
            disabled={resending}
          >
            {resending ? "Sending…" : "Send a new email"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <Sticker name="plate" size={64} />
      <h1 className="mt-3 text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em]">
        Host a party
      </h1>
      <p className="mt-3 text-[17px] text-muted">
        Enter your email and we&apos;ll send you a sign-in link. No password to
        remember.
      </p>
      {linkError && (
        <p className="mt-4 rounded-2xl bg-cat-yellow px-4 py-3 text-sm text-cat-ink">
          That sign-in link expired or was already used. Send yourself a new
          one.
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
            placeholder="you@example.com"
            required
          />
        </label>
        {sendState.error && (
          <p className="text-sm font-semibold text-accent">{sendState.error}</p>
        )}
        <button className={`${ui.pill} w-full`} disabled={sending}>
          {sending ? "Sending…" : "Send me a link"}
        </button>
      </form>
    </div>
  );
}
