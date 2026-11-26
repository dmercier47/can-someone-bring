"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSheet, saveSheet, type Draft, type DraftCategory } from "./actions";
import { categoryColor, CATEGORY_COLORS, type CategoryColor } from "@/lib/types";
import { guessSticker, isSticker, STICKER_KEYS, type StickerKey } from "@/lib/stickers";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";
import { useVisualViewport } from "@/lib/useVisualViewport";

const CARD_BG: Record<CategoryColor, string> = {
  yellow: "bg-cat-yellow",
  pink: "bg-cat-pink",
  blue: "bg-cat-blue",
  mint: "bg-cat-mint",
  tomato: "bg-cat-tomato",
};

export default function SheetEditor({
  sheetId,
  initial,
  claimCounts,
  isNew,
}: {
  sheetId: string;
  initial: Draft;
  /** slotId → number of claims, so we can warn before removing claimed items */
  claimCounts: Record<string, number>;
  isNew: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [showDetails, setShowDetails] = useState(!isNew);
  const [styling, setStyling] = useState<string | null>(null); // category id whose look is being edited
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const visible = useVisualViewport();
  // While the keyboard is open: distance from the layout viewport's bottom to the keyboard's top edge.
  const keyboard = visible?.keyboardOpen
    ? { bottom: Math.max(8, window.innerHeight - (visible.top + visible.height) + 8) }
    : null;

  // Keep the field being edited in the middle of the visible area, clear of the Save bar.
  useEffect(() => {
    if (!visible?.keyboardOpen) return;
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) placeInVisibleArea(el);
  }, [visible?.keyboardOpen, visible?.height]);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      // Wait for the keyboard animation, then center the field.
      setTimeout(() => {
        const vv = window.visualViewport;
        const keyboardOpen = vv && vv.scale <= 1.01 && window.innerHeight - vv.height > 120;
        if (keyboardOpen && document.activeElement === el) placeInVisibleArea(el);
      }, 350);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
  const focusId = useRef<string | null>(null);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Focus a just-added input.
  useEffect(() => {
    if (!focusId.current) return;
    document.getElementById(focusId.current)?.focus();
    focusId.current = null;
  });

  function update(fn: (d: Draft) => Draft) {
    setDraft(fn);
    setDirty(true);
    setError(null);
  }
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => update((d) => ({ ...d, [key]: value }));
  const setCat = (id: string, fn: (c: DraftCategory) => DraftCategory) =>
    update((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? fn(c) : c)) }));

  function claimsIn(cat: DraftCategory) {
    return cat.slots.reduce((n, s) => n + (claimCounts[s.id] ?? 0), 0);
  }

  function addSlot(catId: string) {
    const id = crypto.randomUUID();
    focusId.current = `slot-${id}`;
    setCat(catId, (c) => ({ ...c, slots: [...c.slots, { id, name: "", quantity: 1 }] }));
  }

  function removeSlot(catId: string, slotId: string, name: string) {
    const n = claimCounts[slotId] ?? 0;
    if (n > 0 && !confirm(`${n === 1 ? "Someone has" : `${n} people have`} claimed “${name}”. Remove it anyway?`)) return;
    setCat(catId, (c) => ({ ...c, slots: c.slots.filter((s) => s.id !== slotId) }));
  }

  function addCategory() {
    const id = crypto.randomUUID();
    focusId.current = `cat-${id}`;
    update((d) => ({ ...d, categories: [...d.categories, { id, name: "", sticker: "plate", slots: [] }] }));
  }

  function removeCategory(cat: DraftCategory) {
    const n = claimsIn(cat);
    const msg = n > 0 ? `Remove “${cat.name}” and its ${n} claim${n === 1 ? "" : "s"}?` : `Remove “${cat.name || "this category"}”?`;
    if (!confirm(msg)) return;
    update((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== cat.id) }));
  }

  function move(catId: string, dir: -1 | 1) {
    update((d) => {
      const i = d.categories.findIndex((c) => c.id === catId);
      const j = i + dir;
      if (j < 0 || j >= d.categories.length) return d;
      const cats = [...d.categories];
      [cats[i], cats[j]] = [cats[j], cats[i]];
      return { ...d, categories: cats };
    });
  }

  async function save() {
    setSaving(true);
    // Quietly drop rows the host added but left blank.
    const cleaned: Draft = {
      ...draft,
      categories: draft.categories
        .map((c) => ({ ...c, slots: c.slots.filter((s) => s.name.trim()) }))
        .filter((c) => c.name.trim() || c.slots.length),
    };
    const res = await saveSheet(sheetId, cleaned);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDirty(false);
    router.push(`/sheets/${sheetId}`);
    router.refresh();
  }

  const stylingCat = draft.categories.find((c) => c.id === styling);

  return (
    <>
      {/* Party details */}
      <section className={`${ui.card} mt-6`}>
        <button onClick={() => setShowDetails((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={showDetails}>
          <span>
            <span className="block text-[18px] font-extrabold tracking-tight">Party details</span>
            {!showDetails && <span className="block text-sm text-muted">{draft.title} · Partiful link, note, location</span>}
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-bg text-sm" aria-hidden>
            {showDetails ? "↑" : "↓"}
          </span>
        </button>
        {showDetails && (
          <div className="mt-5 space-y-4">
            <Field label="Party name">
              <input className={ui.input} value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Your name">
              <input className={ui.input} value={draft.hostName} onChange={(e) => set("hostName", e.target.value)} maxLength={60} />
            </Field>
            <Field label="When">
              <input type="datetime-local" className={ui.input} value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </Field>
            <Field label="Partiful invite link" optional>
              <input
                type="url"
                inputMode="url"
                className={ui.input}
                value={draft.partifulUrl}
                onChange={(e) => set("partifulUrl", e.target.value)}
                placeholder="https://partiful.com/e/…"
              />
            </Field>
            <Field label="Where" optional>
              <input className={ui.input} value={draft.location} onChange={(e) => set("location", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Note to guests" optional>
              <textarea
                rows={3}
                className={`${ui.input} resize-none`}
                value={draft.hostNote}
                onChange={(e) => set("hostNote", e.target.value)}
                maxLength={500}
              />
            </Field>
            <label className="flex min-h-11 items-center justify-between gap-4">
              <span className="text-[15px] font-semibold">Guests can add their own items</span>
              <input
                type="checkbox"
                className="size-6 accent-[var(--ink)]"
                checked={draft.allowGuestItems}
                onChange={(e) => set("allowGuestItems", e.target.checked)}
              />
            </label>
          </div>
        )}
      </section>

      {/* The list */}
      <h2 className="mt-8 mb-1 text-[24px] font-extrabold tracking-tight">{isNew ? "What should people bring?" : "The list"}</h2>
      <p className="mb-4 text-[15px] text-muted">Rename, add or remove anything. Tap a sticker to change its look.</p>

      <div>
        {draft.categories.map((cat, idx) => (
          <section
            key={cat.id}
            className={`relative rounded-[30px] px-3 pt-3 text-cat-ink ${CARD_BG[categoryColor(cat, idx)]} ${idx > 0 ? "-mt-7" : ""} pb-11`}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStyling(cat.id)}
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/40"
                aria-label={`Change sticker and color for ${cat.name || "category"}`}
              >
                <Sticker name={isSticker(cat.sticker) ? cat.sticker : "plate"} size={38} />
              </button>
              <input
                id={`cat-${cat.id}`}
                className="h-12 w-0 min-w-0 flex-1 rounded-2xl bg-transparent px-2 text-[21px] font-extrabold tracking-[-0.02em] outline-none placeholder:text-cat-ink/40 focus:bg-white/40"
                value={cat.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCat(cat.id, (c) => ({ ...c, name, sticker: c.sticker === "plate" ? (guessSticker(name) ?? "plate") : c.sticker }));
                }}
                placeholder="Category name"
                maxLength={40}
                aria-label="Category name"
              />
              <IconButton label="Move up" onClick={() => move(cat.id, -1)} disabled={idx === 0}>↑</IconButton>
              <IconButton label="Move down" onClick={() => move(cat.id, 1)} disabled={idx === draft.categories.length - 1}>↓</IconButton>
              <IconButton label={`Remove ${cat.name || "category"}`} onClick={() => removeCategory(cat)}>×</IconButton>
            </div>

            <ul className="mt-2 grid grid-cols-1 gap-1.5">
              {cat.slots.map((slot) => (
                <li key={slot.id} className="flex items-center gap-1 rounded-[18px] bg-cat-row py-1.5 pr-1.5 pl-1.5">
                  <input
                    id={`slot-${slot.id}`}
                    className="h-11 w-0 min-w-0 flex-1 rounded-xl bg-transparent px-2.5 text-[16px] font-semibold outline-none placeholder:text-cat-ink/40 focus:bg-white"
                    value={slot.name}
                    onChange={(e) =>
                      setCat(cat.id, (c) => ({ ...c, slots: c.slots.map((s) => (s.id === slot.id ? { ...s, name: e.target.value } : s)) }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSlot(cat.id))}
                    placeholder="Item, e.g. a salad"
                    maxLength={80}
                    aria-label="Item name"
                    enterKeyHint="next"
                  />
                  {(claimCounts[slot.id] ?? 0) > 0 && (
                    <span className="shrink-0 text-xs font-semibold opacity-60">{claimCounts[slot.id]} claimed</span>
                  )}
                  <Stepper
                    value={slot.quantity}
                    onChange={(q) =>
                      setCat(cat.id, (c) => ({ ...c, slots: c.slots.map((s) => (s.id === slot.id ? { ...s, quantity: q } : s)) }))
                    }
                  />
                  <IconButton label={`Remove ${slot.name || "item"}`} onClick={() => removeSlot(cat.id, slot.id, slot.name)}>×</IconButton>
                </li>
              ))}
              <li>
                <button onClick={() => addSlot(cat.id)} className="h-12 w-full rounded-[18px] border-2 border-dashed border-cat-ink/25 text-sm font-semibold">
                  + Add item
                </button>
              </li>
            </ul>
          </section>
        ))}
        <button
          onClick={addCategory}
          className="relative -mt-7 h-20 w-full rounded-[30px] border-2 border-dashed border-line bg-bg pt-5 text-[15px] font-semibold text-muted"
        >
          + Add category
        </button>
      </div>

      {!isNew && (
        <form action={deleteSheet.bind(null, sheetId)} onSubmit={(e) => !confirm("Delete this party and everyone's claims? This can't be undone.") && e.preventDefault()}>
          <button className="mt-10 h-11 w-full text-sm font-semibold text-accent">Delete this party</button>
        </form>
      )}

      {/* Save bar: rides just above the keyboard while typing, sits at the bottom otherwise */}
      <div
        className={`fixed left-1/2 z-20 w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2 ${keyboard ? "" : "bottom-safe"}`}
        style={keyboard ? { bottom: keyboard.bottom } : undefined}
      >
        {error && <p className="mb-2 rounded-2xl bg-cat-yellow px-4 py-3 text-sm font-semibold text-cat-ink shadow">{error}</p>}
        <button
          // Keep focus in the field being edited so the keyboard doesn't drop on tap.
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
          disabled={saving}
          className={`${ui.pill} w-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${keyboard ? "h-12 text-[15px]" : ""}`}
        >
          {saving ? "Saving…" : isNew ? "Save & get my link" : dirty ? "Save changes" : "Done"}
        </button>
      </div>

      {stylingCat && (
        <StylePicker
          category={stylingCat}
          index={draft.categories.indexOf(stylingCat)}
          onClose={() => setStyling(null)}
          onChange={(patch) => setCat(stylingCat.id, (c) => ({ ...c, ...patch }))}
        />
      )}
    </>
  );
}

/**
 * Scroll so a field sits about a third of the way down the part of the screen that's visible
 * above the keyboard, which keeps it clear of the floating Save bar. (scrollIntoView centers in
 * the full layout viewport, which on iPhone is partly behind the keyboard.)
 */
function placeInVisibleArea(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv) return;
  const target = vv.offsetTop + vv.height * 0.33;
  window.scrollBy({ top: el.getBoundingClientRect().top - target, behavior: "instant" });
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={ui.label}>
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold active:bg-white/40 disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center rounded-full bg-white/70" aria-label="How many">
      <button onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="h-11 w-9 font-bold disabled:opacity-25" aria-label="Fewer">
        −
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
      <button onClick={() => onChange(Math.min(50, value + 1))} className="h-11 w-9 font-bold" aria-label="More">
        +
      </button>
    </div>
  );
}

function StylePicker({
  category,
  index,
  onClose,
  onChange,
}: {
  category: DraftCategory;
  index: number;
  onClose: () => void;
  onChange: (patch: Partial<DraftCategory>) => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const current = categoryColor(category, index);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Category look" className="animate-sheet-up pb-safe relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] bg-bg px-5 pt-5 sm:rounded-[32px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[22px] font-extrabold tracking-tight">{category.name || "Category"} look</h3>
          <button onClick={onClose} className="h-11 rounded-full bg-pill px-5 text-sm font-semibold text-pill-ink">
            Done
          </button>
        </div>

        <p className={ui.label}>Color</p>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ color: c })}
              aria-label={c}
              aria-pressed={current === c}
              className={`size-11 rounded-full ${CARD_BG[c]} ring-offset-2 ring-offset-bg ${current === c ? "ring-2 ring-ink" : ""}`}
            />
          ))}
          {category.color && (
            <button onClick={() => onChange({ color: undefined })} className="h-11 px-3 text-sm font-semibold text-muted underline underline-offset-2">
              Use default
            </button>
          )}
        </div>

        <p className={`${ui.label} mt-6`}>Sticker</p>
        <div className="grid grid-cols-6 gap-1 pb-4 sm:grid-cols-8">
          {STICKER_KEYS.map((k: StickerKey) => (
            <button
              key={k}
              onClick={() => onChange({ sticker: k })}
              aria-label={k}
              aria-pressed={category.sticker === k}
              className={`grid aspect-square place-items-center rounded-2xl ${category.sticker === k ? "bg-cat-yellow ring-2 ring-ink" : "active:bg-surface"}`}
            >
              <Sticker name={k} size={36} eager={false} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
