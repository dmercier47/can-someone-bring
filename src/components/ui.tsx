import Link from "next/link";

/**
 * Shared class names so host and guest screens stay consistent.
 * Radius scale: 12px (rounded-xl) for inputs and icon buttons, 20px for cards/sheets, pill only for actions.
 * Hedvig has one weight, so emphasis comes from size, the serif display face, and ink vs. muted color.
 */
export const ui = {
  input:
    "w-full rounded-xl border border-hair bg-surface px-4 py-3.5 text-[16px] outline-none placeholder:text-faint focus:border-ink",
  label: "mb-1.5 block text-[13px] text-muted",
  pill: "inline-flex h-14 items-center justify-center gap-2 rounded-full bg-pill px-7 text-[16px] text-pill-ink transition-transform active:scale-[0.98] disabled:opacity-30",
  /** Secondary action next to a `pill`: same shape and size, outlined. */
  pillOutline:
    "inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ink/25 px-7 text-[16px] text-ink transition-transform active:scale-[0.98]",
  pillSmall:
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-pill pr-4 pl-3 text-[14px] text-pill-ink transition-transform active:scale-95 disabled:opacity-30",
  ghost: "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-hair bg-surface px-4 text-[14px]",
  iconBtn: "grid size-11 shrink-0 place-items-center rounded-xl border border-hair bg-surface text-ink",
  card: "rounded-[20px] border border-hair bg-surface p-5",
  eyebrow: "text-[11px] tracking-[0.12em] uppercase",
  h1: "font-display text-[40px] leading-[1.02] tracking-[-0.02em]",
};

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-display text-[18px] tracking-[-0.01em]">
      can someone bring<span className="text-accent">?</span>
    </Link>
  );
}

export function HostNav({ right }: { right?: React.ReactNode }) {
  return (
    <nav className="flex h-11 items-center justify-between">
      <Wordmark href="/dashboard" />
      {right}
    </nav>
  );
}
