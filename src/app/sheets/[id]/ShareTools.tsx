"use client";

import { useEffect, useState } from "react";
import { ui } from "@/components/ui";

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
    <section className="rounded-[30px] bg-pill p-5 text-pill-ink">
      <p className="text-sm font-semibold opacity-60">Your signup link</p>
      <p className="mt-1 truncate text-[17px] font-bold">{url.replace(/^https?:\/\//, "")}</p>

      <button
        onClick={() => copy(partifulText, "partiful")}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-bold text-white active:scale-[0.98]"
      >
        {copied === "partiful" ? "Copied! Now paste it in Partiful ✓" : "Copy for Partiful"}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => copy(url, "link")} className={`${ui.ghost} bg-white/10 text-pill-ink`}>
          {copied === "link" ? "Copied ✓" : "Copy link"}
        </button>
        {canShare ? (
          <button
            onClick={() => navigator.share({ title, text: partifulText.replace(` ${url}`, ""), url }).catch(() => {})}
            className={`${ui.ghost} bg-white/10 text-pill-ink`}
          >
            Share…
          </button>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className={`${ui.ghost} bg-white/10 text-pill-ink`}>
            Guest view ↗
          </a>
        )}
      </div>

      <details className="mt-4 text-sm opacity-80">
        <summary className="cursor-pointer py-2 font-semibold">How to add it to Partiful</summary>
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
