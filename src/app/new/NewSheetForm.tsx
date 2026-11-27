"use client";

import { useActionState, useEffect, useState } from "react";
import { createSheet, type NewSheetState } from "./actions";
import { TEMPLATES } from "@/lib/templates";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";
import { PlusIcon } from "@/components/icons";

/** Next Saturday at 7pm, in the browser's local time, formatted for datetime-local. */
function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

/** "2026-11-28T19:30" → "Saturday at 7:30pm", matching what guests will see. */
function previewWhen(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return "";
  const [, y, mo, d, h, mi] = m.map(Number);
  const day = new Date(y, mo - 1, d).toLocaleDateString("en-US", { weekday: "long" });
  const hour = h % 12 || 12;
  return `${day} at ${hour}${mi ? `:${String(mi).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export default function NewSheetForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<NewSheetState, FormData>(createSheet, {});
  const [templateKey, setTemplateKey] = useState(TEMPLATES[0].key);
  const [title, setTitle] = useState(TEMPLATES[0].title);
  const [titleTouched, setTitleTouched] = useState(false);
  const [hostName, setHostName] = useState(defaultName);
  const [timeZone, setTimeZone] = useState("");
  const [start, setStart] = useState("");
  const [more, setMore] = useState(false);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setStart(defaultStart());
  }, []);

  function pick(key: string) {
    setTemplateKey(key);
    if (!titleTouched) setTitle(TEMPLATES.find((t) => t.key === key)?.title ?? "");
  }

  return (
    <form action={action} className="space-y-7">
      <fieldset>
        <legend className="mb-3 font-display tracking-[-0.015em] text-[24px]">What kind of party?</legend>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t, i) => {
            const active = t.key === templateKey;
            // "Start from scratch" spans the row; so does a lone last card in the 2-column grid.
            const wide = t.key === "blank" || (i === TEMPLATES.length - 1 && (TEMPLATES.length - 1) % 2 === 1);
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => pick(t.key)}
                aria-pressed={active}
                className={`flex rounded-[20px] border p-4 text-left transition ${
                  active ? "border-cat-ink bg-cat-yellow text-cat-ink" : "border-hair bg-surface"
                } ${wide ? "col-span-2 flex-row items-center gap-3" : "min-h-[116px] flex-col items-start"}`}
              >
                <Sticker name={t.sticker} size={wide ? 32 : 40} />
                <span className={wide ? "" : "mt-auto"}>
                  <span className="block font-display text-[18px] leading-tight">{t.name}</span>
                  <span className="block text-[13px] leading-snug opacity-65">{t.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="template" value={templateKey} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 font-display tracking-[-0.015em] text-[24px]">The details</legend>
        <label className="block">
          <span className={ui.label}>Party name</span>
          <input
            name="title"
            className={ui.input}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleTouched(true);
            }}
            placeholder="e.g. Sam's birthday dinner"
            maxLength={80}
            required
          />
        </label>
        <label className="block">
          <span className={ui.label}>Your name</span>
          <input
            name="hostName"
            className={ui.input}
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            autoComplete="given-name"
            placeholder="First name is fine"
            maxLength={60}
            required
          />
          <span className="mt-1.5 block text-[13px] text-muted">
            Guests see: &ldquo;{hostName.trim() || "You"}&apos;s hosting <b>{title.trim() || "…"}</b>
            {start && <> {previewWhen(start)}</>}.&rdquo;
          </span>
        </label>
        <label className="block">
          <span className={ui.label}>When</span>
          <input name="startsAt" type="datetime-local" className={ui.input} value={start} onChange={(e) => setStart(e.target.value)} required />
          <input type="hidden" name="timeZone" value={timeZone} />
        </label>
        <label className="block">
          <span className={ui.label}>
            Partiful invite link <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="partifulUrl" type="url" inputMode="url" className={ui.input} placeholder="https://partiful.com/e/…" />
          <span className="mt-1.5 block text-[13px] text-muted">Adds an &ldquo;Invite&rdquo; button so guests can hop back. You can add it later.</span>
        </label>

        {more ? (
          <>
            <label className="block">
              <span className={ui.label}>
                Where <span className="font-normal text-muted">(optional)</span>
              </span>
              <input name="location" className={ui.input} placeholder="e.g. Sam's place · Brooklyn" maxLength={120} />
            </label>
            <label className="block">
              <span className={ui.label}>
                Note to guests <span className="font-normal text-muted">(optional)</span>
              </span>
              <textarea
                name="hostNote"
                rows={3}
                className={`${ui.input} resize-none`}
                placeholder="I've got the turkey covered! Grab anything below."
                maxLength={500}
              />
            </label>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="flex h-11 items-center gap-1.5 text-[14px] text-accent">
            <PlusIcon size={16} />
            Add a location or note
          </button>
        )}
      </fieldset>

      {state.error && <p className="border-l-2 border-accent pl-3 text-[14px]">{state.error}</p>}

      <button className={`${ui.pill} w-full`} disabled={pending || !timeZone}>
        {pending ? "Creating…" : "Next: the list"}
      </button>
    </form>
  );
}
