"use client";

import { useEffect, useState } from "react";
import { ArrowUpRightIcon, CheckIcon, LinkIcon, ShareIcon } from "@/components/icons";

export default function ShareTools({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState<"partiful" | "link" | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);
  const partifulText = `🍽️ Can someone bring something? Claim what you're bringing here: ${url}`;

  async function copy(text: string, which: "partiful" | "link") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: fall back to a temporary textarea.
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="rounded-[20px] bg-pill p-5 text-pill-ink">
      <p className="text-[13px] text-white/55">Your signup link</p>
      <p className="mt-1 truncate font-display text-[20px]">{url.replace(/^https?:\/\//, "")}</p>

      <button
        onClick={() => copy(partifulText, "partiful")}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] text-white active:scale-[0.98]"
      >
        {copied === "partiful" ? <CheckIcon size={18} /> : null}
        {copied === "partiful" ? "Copied. Paste it into Partiful" : "Copy for Partiful"}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => copy(url, "link")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 text-[14px] text-pill-ink">
          {copied === "link" ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        {canShare ? (
          <button
            onClick={() => navigator.share({ title, text: partifulText.replace(` ${url}`, ""), url }).catch(() => {})}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 text-[14px] text-pill-ink"
          >
            <ShareIcon size={16} />
            Share
          </button>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 text-[14px] text-pill-ink">
            Guest view
            <ArrowUpRightIcon size={16} />
          </a>
        )}
      </div>

      <details className="mt-4 text-[14px] text-white/75">
        <summary className="cursor-pointer py-2">How to add it to Partiful</summary>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>Tap &ldquo;Copy for Partiful&rdquo; above.</li>
          <li>Open your event in Partiful and tap Edit.</li>
          <li>Paste it into the event description and save.</li>
          <li>Send your invites. Guests tap the link to claim something.</li>
        </ol>
      </details>
    </section>
  );
}
