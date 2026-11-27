"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "@/components/icons";

/**
 * One job: get the link into the Partiful invite. A single "Copy sign-up link" button, nothing else.
 * (Viewing as a guest lives in the ⋯ menu.)
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

  // No card or visible URL: the host never needs to read the slug, just get it into Partiful.
  return (
    <section>
      <button
        onClick={copy}
        aria-live="polite"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] text-accent-ink active:scale-[0.98]"
      >
        {copied ? <CheckIcon size={18} /> : <LinkIcon size={18} />}
        {copied ? "Copied" : "Copy sign-up link"}
      </button>
    </section>
  );
}
