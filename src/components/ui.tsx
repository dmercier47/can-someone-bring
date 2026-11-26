import Link from "next/link";

/** Shared class names so host and guest screens stay consistent. */
export const ui = {
  input:
    "w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[16px] outline-none placeholder:text-faint focus:border-ink",
  label: "mb-1.5 block text-sm font-semibold",
  pill: "inline-flex h-14 items-center justify-center rounded-full bg-pill px-7 text-[16px] font-bold text-pill-ink transition-transform active:scale-[0.98] disabled:opacity-30",
  pillSmall:
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-pill px-4 text-sm font-semibold text-pill-ink transition-transform active:scale-95 disabled:opacity-30",
  ghost: "inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold",
  card: "rounded-3xl bg-surface p-5",
};

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="text-[15px] font-extrabold tracking-tight">
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
