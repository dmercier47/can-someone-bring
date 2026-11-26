"use client";

import { useEffect } from "react";
import { categoryColor, CATEGORY_COLORS, type CategoryColor } from "@/lib/types";
import { STICKER_KEYS, type StickerKey } from "@/lib/stickers";
import { ui } from "@/components/ui";
import Sticker from "@/components/Sticker";
import { MinusIcon, PlusIcon } from "@/components/icons";

export { CARD_BG } from "@/lib/colors";
import { CARD_BG } from "@/lib/colors";

export function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={ui.label}>
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-10 shrink-0 place-items-center rounded-xl active:bg-white/50 disabled:opacity-25 [@media(hover:hover)]:hover:bg-white/50"
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex h-10 shrink-0 items-center rounded-xl bg-white/60" aria-label="How many">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="grid h-10 w-9 place-items-center disabled:opacity-25"
        aria-label="Fewer"
      >
        <MinusIcon size={16} />
      </button>
      <span className="w-5 text-center text-[14px] tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(50, value + 1))} className="grid h-10 w-9 place-items-center" aria-label="More">
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

/** Locks page scroll while a sheet/modal is open. */
export function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  title,
  onClose,
  action,
  children,
}: {
  title: string;
  onClose: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet-up pb-safe relative max-h-[90dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[24px] bg-bg px-5 pt-5 sm:rounded-[24px] sm:pb-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-[26px] tracking-[-0.015em]">{title}</h3>
          {action ?? (
            <button type="button" onClick={onClose} className="h-10 rounded-full bg-pill px-5 text-[14px] text-pill-ink">
              Done
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function StylePicker({
  name,
  sticker,
  color,
  index,
  onClose,
  onChange,
}: {
  name: string;
  sticker: string;
  color?: CategoryColor;
  index: number;
  onClose: () => void;
  onChange: (patch: { sticker?: StickerKey; color?: CategoryColor | undefined }) => void;
}) {
  const current = categoryColor({ color }, index);
  return (
    <Sheet title={`${name || "Category"} look`} onClose={onClose}>
      <p className={ui.label}>Color</p>
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange({ color: c })}
            aria-label={c}
            aria-pressed={current === c}
            className={`size-11 rounded-full ${CARD_BG[c]} ring-offset-2 ring-offset-bg ${current === c ? "ring-2 ring-ink" : ""}`}
          />
        ))}
        {color && (
          <button
            type="button"
            onClick={() => onChange({ color: undefined })}
            className="h-11 px-3 text-[14px] text-muted underline underline-offset-2"
          >
            Use default
          </button>
        )}
      </div>

      <p className={`${ui.label} mt-6`}>Sticker</p>
      <div className="grid grid-cols-6 gap-1 pb-4 sm:grid-cols-8">
        {STICKER_KEYS.map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => onChange({ sticker: k })}
            aria-label={k}
            aria-pressed={sticker === k}
            className={`grid aspect-square place-items-center rounded-xl ${sticker === k ? "bg-surface ring-2 ring-ink" : "active:bg-surface"}`}
          >
            <Sticker name={k} size={36} eager={false} />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
