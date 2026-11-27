"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "@/components/icons";

/**
 * One job: get the link into the Partiful invite. A single "Copy link" button plus a one-line
 * how-to. (Viewing as a guest lives in the ⋯ menu.)
 */
export default function ShareTools({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers and non-secure dev origins: fall back to a temporary textarea.
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section className="rounded-[20px] border border-hair bg-surface p-5">
      <p className="text-[13px] text-muted">Your signup link</p>
      <p className="mt-1 truncate font-display text-[20px]">{url.replace(/^https?:\/\//, "")}</p>

      <button
        onClick={copy}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] text-accent-ink active:scale-[0.98]"
      >
        {copied ? <CheckIcon size={18} /> : <LinkIcon size={18} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <p className="mt-3 text-center text-[14px] text-muted" aria-live="polite">
        {copied ? "Now paste it into your Partiful event description." : "Paste it into your Partiful event description."}
      </p>
    </section>
  );
}
