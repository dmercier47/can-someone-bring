"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { confirmSignIn } from "./actions";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";

type Params = { token_hash?: string; type?: string; code?: string; next?: string };

/** Submits automatically in a real browser. Link-preview bots don't run JS, so they never use the link. */
export default function ConfirmSignIn({ params }: { params: Params }) {
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    form.current?.requestSubmit();
  }, []);

  return (
    <form ref={form} action={confirmSignIn} className="text-center">
      {Object.entries(params).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <Sticker name="party" size={72} className="mx-auto" />
      <h1 className="mt-4 text-[30px] leading-tight font-extrabold tracking-[-0.03em]">Signing you in…</h1>
      <p className="mt-2 text-muted">One sec.</p>
      <ContinueButton />
    </form>
  );
}

function ContinueButton() {
  const { pending } = useFormStatus();
  return (
    <button className={`${ui.pill} mt-8 w-full`} disabled={pending}>
      {pending ? "Signing in…" : "Continue"}
    </button>
  );
}
