"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSheet, saveDetails, type Details } from "./actions";
import { ui } from "@/components/ui";
import { Field, Sheet } from "@/components/editor";
import { CloseIcon, DotsIcon, EyeIcon, SlidersIcon, TrashIcon } from "@/components/icons";

/** Top-right "⋯" menu with party-level settings. */
export default function PartyMenu({ sheetId, guestUrl, details }: { sheetId: string; guestUrl: string; details: Details }) {
  const [open, setOpen] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Second tap confirms (no browser pop-up: iOS can silently block those).
  const [armDelete, setArmDelete] = useState(false);
  useEffect(() => {
    if (!open) setArmDelete(false);
  }, [open]);
  async function confirmDelete() {
    if (!armDelete) return setArmDelete(true);
    setOpen(false);
    await deleteSheet(sheetId);
  }

  const item = "flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] active:bg-bg [@media(hover:hover)]:hover:bg-bg";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Party settings"
        aria-haspopup="menu"
        aria-expanded={open}
        className={ui.iconBtn}
      >
        <DotsIcon />
      </button>

      {open && (
        <div role="menu" className="animate-fade-in absolute top-12 right-0 z-30 w-60 overflow-hidden rounded-[16px] border border-hair bg-surface py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              setEditingDetails(true);
            }}
          >
            <SlidersIcon className="text-muted" /> Party details
          </button>
          <a role="menuitem" className={item} href={guestUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            <EyeIcon className="text-muted" /> View as a guest
          </a>
          <div className="my-1.5 h-px bg-hair" />
          <button role="menuitem" className={`${item} text-accent`} onClick={confirmDelete}>
            <TrashIcon /> {armDelete ? "Tap again to delete for good" : "Delete party"}
          </button>
        </div>
      )}

      {editingDetails && <DetailsSheet sheetId={sheetId} initial={details} onClose={() => setEditingDetails(false)} />}
    </div>
  );
}

function DetailsSheet({ sheetId, initial, onClose }: { sheetId: string; initial: Details; onClose: () => void }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Details>(k: K, v: Details[K]) => setD((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    const res = await saveDetails(sheetId, d);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.refresh();
    onClose();
  }

  return (
    <Sheet
      title="Party details"
      onClose={onClose}
      action={
        <button type="button" onClick={onClose} className={`${ui.iconBtn} text-muted`} aria-label="Close">
          <CloseIcon />
        </button>
      }
    >
      <form
        className="space-y-4 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Party name">
          <input className={ui.input} value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={80} required />
        </Field>
        <Field label="Your name">
          <input className={ui.input} value={d.hostName} onChange={(e) => set("hostName", e.target.value)} maxLength={60} required />
        </Field>
        <Field label="When">
          <input type="datetime-local" className={ui.input} value={d.startsAt} onChange={(e) => set("startsAt", e.target.value)} required />
        </Field>
        <Field label="Where" optional>
          <input className={ui.input} value={d.location} onChange={(e) => set("location", e.target.value)} maxLength={120} />
        </Field>
        <Field label="Invite link" optional>
          <input
            type="url"
            inputMode="url"
            className={ui.input}
            value={d.partifulUrl}
            onChange={(e) => set("partifulUrl", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="Note to guests" optional>
          <textarea rows={3} className={`${ui.input} resize-none`} value={d.hostNote} onChange={(e) => set("hostNote", e.target.value)} maxLength={500} />
        </Field>
        <label className="flex min-h-11 items-center justify-between gap-4">
          <span className="text-[15px]">Guests can add their own items</span>
          <input type="checkbox" className="size-6 accent-[var(--ink)]" checked={d.allowGuestItems} onChange={(e) => set("allowGuestItems", e.target.checked)} />
        </label>
        {error && <p className="border-l-2 border-accent pl-3 text-[14px]">{error}</p>}
        <button className={`${ui.pill} w-full`} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
      </form>
    </Sheet>
  );
}
