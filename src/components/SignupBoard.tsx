"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { categoryColor, takenCount, type Category, type CategoryColor, type Claim, type Sheet, type Slot } from "@/lib/types";
import type { StickerKey } from "@/lib/stickers";
import { addGuestItem, claimSlot, dropClaim as dropClaimAction } from "@/app/s/[slug]/actions";
import Sticker from "./Sticker";
import { CloseIcon, MinusIcon, PlusIcon } from "./icons";
import { ui } from "./ui";
import { useVisualViewport } from "@/lib/useVisualViewport";

const NAME_KEY = "csb:name";
/** claimId → secret edit token, per sheet, kept on this device. */
const mineKey = (slug: string) => `csb:mine:${slug}`;
type MyTokens = Record<string, string>;

function loadTokens(slug: string): MyTokens {
  try {
    return JSON.parse(localStorage.getItem(mineKey(slug)) ?? "{}") as MyTokens;
  } catch {
    return {};
  }
}

function saveTokens(slug: string, tokens: MyTokens) {
  try {
    localStorage.setItem(mineKey(slug), JSON.stringify(tokens));
  } catch {}
}

import { CARD_BG } from "@/lib/colors";
const AVATAR_BG = [CARD_BG.pink, CARD_BG.yellow, CARD_BG.blue, CARD_BG.mint, CARD_BG.tomato];

type Panel = { kind: "claim"; slot: Slot; category: Category } | { kind: "custom" } | null;

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Stable color per guest name, so the same person keeps the same avatar color. */
function avatarBg(name: string) {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

const STOP = new Set(["the", "and", "some", "with", "for", "bag", "bags", "of", "a", "an", "or"]);
function words(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.replace(/s$/, ""))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export default function SignupBoard({ sheet, when, dateLabel }: { sheet: Sheet; when: string; dateLabel: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(sheet.categories);
  const [claims, setClaims] = useState<Claim[]>(sheet.claims);
  const [tokens, setTokens] = useState<MyTokens>({});
  const [name, setName] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The server is the source of truth: adopt fresh data whenever the page re-renders with it.
  useEffect(() => {
    setCategories(sheet.categories);
    setClaims(sheet.claims);
  }, [sheet]);

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
    setTokens(loadTokens(sheet.slug));
  }, [sheet.slug]);

  // Pick up other guests' claims when someone comes back to the tab.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const mine = useMemo(() => Object.keys(tokens), [tokens]);

  function setMyTokens(next: MyTokens) {
    setTokens(next);
    saveTokens(sheet.slug, next);
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const claimsBySlot = useMemo(() => {
    const m = new Map<string, Claim[]>();
    for (const c of claims) m.set(c.slotId, [...(m.get(c.slotId) ?? []), c]);
    return m;
  }, [claims]);

  const openCount = (s: Slot) => Math.max(0, s.quantity - takenCount(claimsBySlot.get(s.id) ?? []));
  const allSlots = categories.flatMap((c) => c.slots);
  const stillNeeded = allSlots.reduce((n, s) => n + openCount(s), 0);
  const myClaims = claims.filter((c) => mine.includes(c.id));
  const guests = [...new Set(claims.map((c) => c.guestName))];

  // Up to three open items for the header sentence, taken round-robin across categories for variety.
  const asks = useMemo(() => {
    const queues = categories.map((c, idx) =>
      c.slots
        .filter((s) => s.quantity - takenCount(claimsBySlot.get(s.id) ?? []) > 0)
        .map((s) => ({ slot: s, cat: c, color: categoryColor(c, idx) })),
    );
    const out: { slot: Slot; sticker: StickerKey; color: CategoryColor }[] = [];
    for (let i = 0; out.length < 3 && queues.some((q) => q.length > i); i++) {
      for (const q of queues) {
        if (q[i] && out.length < 3) out.push({ slot: q[i].slot, sticker: q[i].slot.sticker ?? q[i].cat.sticker, color: q[i].color });
      }
    }
    return out;
  }, [categories, claimsBySlot]);

  function rememberName(n: string) {
    setName(n);
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {}
  }

  async function addClaim(
    slotId: string,
    data: { guestName: string; detail?: string; dietaryNote?: string; quantity: number },
    label: string,
  ) {
    setBusy(true);
    const res = await claimSlot(sheet.slug, slotId, data);
    setBusy(false);
    if (!res.ok) {
      setToast(res.error);
      setPanel(null);
      router.refresh();
      return;
    }
    const claim: Claim = { id: res.data.claimId, slotId, ...data };
    setClaims((cs) => [...cs, claim]);
    setMyTokens({ ...tokens, [claim.id]: res.data.editToken });
    rememberName(data.guestName);
    setPanel(null);
    setToast(`Iconic. You're on ${lowerFirst(label)}${data.quantity > 1 ? ` (${data.quantity})` : ""}.`);
    router.refresh();
  }

  async function dropClaim(id: string) {
    const token = tokens[id];
    if (!token) return;
    const prev = claims;
    setClaims((cs) => cs.filter((c) => c.id !== id)); // optimistic
    const res = await dropClaimAction(sheet.slug, id, token);
    if (!res.ok) {
      setClaims(prev);
      setToast(res.error);
      return;
    }
    const { [id]: _removed, ...rest } = tokens;
    void _removed;
    setMyTokens(rest);
    setToast("All good. It's back up for grabs.");
    router.refresh();
  }

  async function addCustom(categoryId: string, itemName: string, data: { guestName: string; dietaryNote?: string }) {
    setBusy(true);
    const res = await addGuestItem(sheet.slug, categoryId, itemName, data);
    setBusy(false);
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    const slot: Slot = { id: res.data.slotId, name: itemName, quantity: 1, createdByGuest: true };
    setCategories((cats) => cats.map((c) => (c.id === categoryId ? { ...c, slots: [...c.slots, slot] } : c)));
    setClaims((cs) => [...cs, { id: res.data.claimId, slotId: slot.id, quantity: 1, ...data }]);
    setMyTokens({ ...tokens, [res.data.claimId]: res.data.editToken });
    rememberName(data.guestName);
    setPanel(null);
    setToast(`Iconic. You're on ${lowerFirst(itemName)}.`);
    router.refresh();
  }

  function findSimilar(text: string): string | null {
    const target = new Set(words(text));
    if (!target.size) return null;
    for (const slot of allSlots) {
      const slotClaims = claimsBySlot.get(slot.id) ?? [];
      if (!slotClaims.length) continue;
      const haystack = [slot.name, ...slotClaims.map((c) => c.detail ?? "")].join(" ");
      if (words(haystack).some((w) => target.has(w))) {
        return `${slotClaims[0].guestName} is already bringing ${lowerFirst(slotClaims[0].detail || slot.name)}.`;
      }
    }
    return null;
  }

  function claimLabel(c: Claim) {
    return c.detail || allSlots.find((s) => s.id === c.slotId)?.name || "something";
  }

  return (
    <>
      {/* Header sentence: the product's name, in action. Open items get a marker highlight in their category color. */}
      <h1 className="mt-7 font-display text-[30px] leading-[1.18] tracking-[-0.015em] text-faint">
        {sheet.hostName}&apos;s hosting <span className="text-ink">{sheet.title}</span> {when}.{" "}
        {asks.length > 0 ? (
          <>
            Can someone bring{" "}
            {asks.map((a, i) => (
              <Fragment key={a.slot.id}>
                {i > 0 && (i === asks.length - 1 ? " or " : ", ")}
                <span className="marker" style={{ "--hl": `var(--cat-${a.color})` } as React.CSSProperties}>
                  {lowerFirst(a.slot.name)}
                </span>
                <Sticker name={a.sticker} size={32} className="-mt-1.5 ml-1 align-middle" />
              </Fragment>
            ))}
            ?
          </>
        ) : (
          <>
            <span className="marker">The table is set.</span>
            <Sticker name="party" size={32} className="-mt-1.5 ml-1 align-middle" /> Just bring yourself.
          </>
        )}
      </h1>

      <p className="mt-3 text-[14px] text-muted">
        {dateLabel}
        {sheet.location && <> · {sheet.location}</>}
      </p>

      <div className="mt-7 mb-6 flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2.5">
          {/* Big number in the sans: the serif "11" reads as "ll". */}
          <span className="text-[60px] leading-[0.75] tracking-[-0.04em] tabular-nums">{stillNeeded}</span>
          <span className="text-[14px] text-muted">still needed</span>
        </p>
        {guests.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <div className="flex">
              {guests.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className={`-ml-2 grid size-7 place-items-center rounded-full border-2 border-bg text-[11px] text-cat-ink first:ml-0 ${avatarBg(g)}`}
                >
                  {initial(g)}
                </span>
              ))}
            </div>
            {/* Who's bringing something, not who's attending: RSVPs live in Partiful. */}
            {guests.length} bringing
          </div>
        )}
      </div>

      {sheet.hostNote && (
        <p className="mb-7 border-l-2 border-ink pl-4 text-[15px] leading-relaxed text-ink/80">
          <span className="text-muted">{sheet.hostName} · </span>
          {sheet.hostNote}
        </p>
      )}

      {/* Category bands: full width on phones, every band open, one continuous scroll */}
      <div className="-mx-4 sm:mx-0 sm:grid sm:gap-3">
        {categories.map((cat, idx) => {
          const open = cat.slots.reduce((n, s) => n + openCount(s), 0);
          return (
            <section
              key={cat.id}
              aria-labelledby={`h-${cat.id}`}
              className={`px-5 pt-5 pb-2 text-cat-ink sm:rounded-[20px] ${CARD_BG[categoryColor(cat, idx)]}`}
            >
              <div className="flex items-center gap-2.5 pb-2">
                <Sticker name={cat.sticker} size={36} className="-ml-0.5" />
                <h2 id={`h-${cat.id}`} className="flex-1 font-display text-[24px] tracking-[-0.015em]">
                  {cat.name}
                </h2>
                <span className={`${ui.eyebrow} text-cat-muted`}>{open > 0 ? `${open} open` : "All set"}</span>
              </div>
              <ul>
                {cat.slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    claims={claimsBySlot.get(slot.id) ?? []}
                    mine={mine}
                    onClaim={() => setPanel({ kind: "claim", slot, category: cat })}
                    onDrop={dropClaim}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Floating action: "something else", and what you're bringing once you've claimed */}
      {(sheet.allowGuestItems || myClaims.length > 0) && (
        <div className="animate-pop-in bottom-safe fixed left-1/2 z-20 w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2">
          <div className="flex min-h-14 items-center gap-3 rounded-2xl bg-pill py-2 pr-2 pl-5 text-pill-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            {myClaims.length > 0 ? (
              <p className="min-w-0 flex-1 leading-tight">
                <span className="block text-[12px] text-pill-ink/60">You&apos;re bringing</span>
                <span className="block truncate text-[15px]">{myClaims.map(claimLabel).join(", ")}</span>
              </p>
            ) : (
              <span className="flex-1 text-[15px]">Bring something else</span>
            )}
            {sheet.allowGuestItems && (
              <button
                onClick={() => setPanel({ kind: "custom" })}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink active:scale-95"
                aria-label="Bring something else"
              >
                <PlusIcon size={20} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="animate-fade-in fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90vw] rounded-xl bg-pill px-4 py-3 text-[14px] text-pill-ink shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {toast}
        </div>
      )}

      {panel && (
        <BottomSheet
          onClose={() => setPanel(null)}
          title={panel.kind === "claim" ? `Bring ${lowerFirst(panel.slot.name)}` : "Bring something else"}
          sticker={panel.kind === "claim" ? (panel.slot.sticker ?? panel.category.sticker) : "plate"}
        >
          {panel.kind === "claim" ? (
            <ClaimForm
              busy={busy}
              key={panel.slot.id}
              slot={panel.slot}
              open={openCount(panel.slot)}
              defaultName={name}
              onSubmit={(d) => addClaim(panel.slot.id, d, d.detail || panel.slot.name)}
            />
          ) : (
            <CustomForm
              busy={busy}
              categories={categories}
              defaultName={name}
              findSimilar={findSimilar}
              onSubmit={(catId, item, d) => addCustom(catId, item, d)}
            />
          )}
        </BottomSheet>
      )}
    </>
  );
}

function SlotRow({
  slot,
  claims,
  mine,
  onClaim,
  onDrop,
}: {
  slot: Slot;
  claims: Claim[];
  mine: string[];
  onClaim: () => void;
  onDrop: (id: string) => void;
}) {
  const open = slot.quantity - takenCount(claims);
  const full = open <= 0;
  const myClaim = claims.find((c) => mine.includes(c.id));

  // Second line: who's on it (and what), how many are left, or the host's note.
  const who = claims.map((c) => {
    const person = `${mine.includes(c.id) ? "You" : c.guestName}${c.quantity > 1 ? ` ×${c.quantity}` : ""}`;
    return c.detail ? `${person}: ${lowerFirst(c.detail)}` : person;
  });
  const sub = [
    ...(slot.quantity > 1 && !full ? [`${open} of ${slot.quantity} left`] : []),
    ...(claims.length && !full ? who : []),
    ...(full && claims.length ? claims.filter((c) => c.detail).map((c) => c.detail as string) : []),
    ...(!claims.length && slot.note ? [slot.note] : []),
  ].join(" · ");

  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-cat-hair py-2.5">
      <div className="min-w-0 flex-1">
        <p className={`text-[16px] leading-snug ${full && !myClaim ? "text-cat-muted" : ""}`}>{slot.name}</p>
        {sub && <p className="text-[13px] leading-snug text-cat-muted">{sub}</p>}
      </div>

      {myClaim ? (
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[13px] text-cat-muted">{myClaim.quantity > 1 ? `You ×${myClaim.quantity}` : "You"}</span>
          <button onClick={() => onDrop(myClaim.id)} className="h-9 rounded-full border border-cat-hair px-3.5 text-[13px]">
            Undo
          </button>
        </span>
      ) : full ? (
        <span className="flex shrink-0 items-center gap-2 text-[13px] text-cat-muted" aria-label={`Covered by ${claims.map((c) => c.guestName).join(" and ")}`}>
          <span className="flex">
            {claims.slice(0, 3).map((c) => (
              <span key={c.id} className="-ml-1.5 grid size-6 place-items-center rounded-full border-2 border-white/70 bg-white text-[11px] text-cat-ink first:ml-0">
                {initial(c.guestName)}
              </span>
            ))}
          </span>
          {claims.length === 1 ? claims[0].guestName : `${claims.length} people`}
        </span>
      ) : (
        <button
          onClick={onClaim}
          className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-cat-ink pr-3.5 pl-2.5 text-[13px] text-white transition-transform active:scale-95"
          aria-label={`I'll bring ${slot.name}`}
        >
          <PlusIcon size={15} strokeWidth={2.2} />
          {slot.quantity > 1 && claims.length > 0 ? "I'll bring one" : "I'll bring it"}
        </button>
      )}
    </li>
  );
}

function BottomSheet({
  title,
  sticker,
  onClose,
  children,
}: {
  title: string;
  sticker: StickerKey;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  const visible = useVisualViewport();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // When a field gets focus (or the keyboard finishes opening), keep it visible inside the sheet.
  useEffect(() => {
    const el = document.activeElement;
    if (visible?.keyboardOpen && el instanceof HTMLElement && ref.current?.contains(el)) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [visible?.height, visible?.keyboardOpen]);

  return (
    // Sized to the *visible* screen area, so on iPhone the sheet rides on top of the keyboard.
    <div
      className="fixed inset-x-0 top-0 z-40 flex h-dvh items-end justify-center sm:items-center"
      style={visible ? { top: visible.top, height: visible.height } : undefined}
    >
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onFocus={(e) => {
          const target = e.target;
          // Wait for the keyboard to start opening before scrolling.
          setTimeout(() => target.scrollIntoView({ block: "nearest" }), 300);
        }}
        className={`animate-sheet-up relative w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[24px] bg-bg px-5 pt-3 shadow-2xl sm:rounded-[24px] sm:pb-6 ${
          visible?.keyboardOpen ? "pb-4" : "pb-safe"
        }`}
        style={{ maxHeight: visible ? visible.height - 12 : "90dvh" }}
      >
        {!visible?.keyboardOpen && <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />}
        {/* Compact header while typing, so more of the form fits above the keyboard. */}
        <div className={`flex items-center gap-3 ${visible?.keyboardOpen ? "mb-3" : "mb-5"}`}>
          <Sticker name={sticker} size={visible?.keyboardOpen ? 32 : 48} />
          <h3
            className={`flex-1 font-display leading-tight tracking-[-0.015em] ${visible?.keyboardOpen ? "text-[20px]" : "text-[26px]"}`}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`-mr-1 ${ui.iconBtn} text-muted`}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = ui.input;

function NameAndDiet({
  name,
  setName,
  diet,
  setDiet,
}: {
  name: string;
  setName: (s: string) => void;
  diet: string;
  setDiet: (s: string) => void;
}) {
  const [showDiet, setShowDiet] = useState(Boolean(diet));
  return (
    <>
      <label className="block">
        <span className={ui.label}>Your name</span>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name is fine"
          autoComplete="given-name"
          required
          enterKeyHint="done"
        />
      </label>
      {showDiet ? (
        <label className="block">
          <span className={ui.label}>Dietary notes</span>
          <input
            className={inputCls}
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            placeholder="e.g. vegetarian, contains nuts"
          />
        </label>
      ) : (
        <button type="button" onClick={() => setShowDiet(true)} className="flex h-11 items-center gap-1.5 text-[14px] text-accent">
          <PlusIcon size={16} />
          Add a dietary note
        </button>
      )}
    </>
  );
}

function SubmitButton({ children, disabled, busy }: { children: React.ReactNode; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled || busy}
      aria-busy={busy}
      className={`${ui.pill} mt-1 w-full aria-busy:opacity-60`}
    >
      {busy ? "Saving…" : children}
    </button>
  );
}

function ClaimForm({
  slot,
  open,
  defaultName,
  busy,
  onSubmit,
}: {
  slot: Slot;
  /** Spots still open on this item; guests can take more than one. */
  open: number;
  defaultName: string;
  busy: boolean;
  onSubmit: (d: { guestName: string; detail?: string; dietaryNote?: string; quantity: number }) => void;
}) {
  const [count, setCount] = useState(1);
  const [name, setName] = useState(defaultName);
  const [detail, setDetail] = useState("");
  const [diet, setDiet] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ guestName: name.trim(), detail: detail.trim() || undefined, dietaryNote: diet.trim() || undefined, quantity: count });
      }}
    >
      {open > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px]">
            How many?<span className="text-muted"> {open} still needed</span>
          </span>
          <div className="flex h-11 shrink-0 items-center rounded-xl border border-hair bg-surface" role="group" aria-label="How many">
            <button
              type="button"
              onClick={() => setCount((n) => Math.max(1, n - 1))}
              disabled={count <= 1}
              className="grid h-11 w-11 place-items-center disabled:opacity-25"
              aria-label="Fewer"
            >
              <MinusIcon size={16} />
            </button>
            <span className="w-6 text-center text-[16px] tabular-nums" aria-live="polite">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setCount((n) => Math.min(open, n + 1))}
              disabled={count >= open}
              className="grid h-11 w-11 place-items-center disabled:opacity-25"
              aria-label="More"
            >
              <PlusIcon size={16} />
            </button>
          </div>
        </div>
      )}
      <label className="block">
        <span className={ui.label}>
          What exactly? (optional)
        </span>
        <input
          className={inputCls}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={slot.note ?? `e.g. my famous ${lowerFirst(slot.name).replace(/^an? /, "")}`}
        />
      </label>
      <NameAndDiet name={name} setName={setName} diet={diet} setDiet={setDiet} />
      <SubmitButton busy={busy} disabled={!name.trim()}>
        {count > 1 ? `I'm bringing ${count}` : "I'm bringing it"}
      </SubmitButton>
    </form>
  );
}

function CustomForm({
  categories,
  defaultName,
  busy,
  findSimilar,
  onSubmit,
}: {
  categories: Category[];
  defaultName: string;
  busy: boolean;
  findSimilar: (s: string) => string | null;
  onSubmit: (categoryId: string, item: string, d: { guestName: string; dietaryNote?: string }) => void;
}) {
  const [item, setItem] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState(defaultName);
  const [diet, setDiet] = useState("");
  const similar = item.trim().length > 2 ? findSimilar(item) : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!item.trim() || !name.trim()) return;
        onSubmit(catId, item.trim(), { guestName: name.trim(), dietaryNote: diet.trim() || undefined });
      }}
    >
      <label className="block">
        <span className={ui.label}>What are you bringing?</span>
        <input className={inputCls} value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. cranberry sauce" required />
      </label>
      {similar && (
        <p className="border-l-2 border-accent pl-3 text-[14px] leading-snug text-ink/80">
          {similar} Still want to bring yours too?
        </p>
      )}
      <fieldset>
        <legend className={ui.label}>Which category?</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c, i) => {
            const active = catId === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCatId(c.id)}
                aria-pressed={active}
                className={`flex h-11 items-center gap-1.5 rounded-xl border pr-3.5 pl-2 text-[14px] transition ${
                  active ? `${CARD_BG[categoryColor(c, i)]} border-cat-ink text-cat-ink` : "border-hair bg-surface text-ink"
                }`}
              >
                <Sticker name={c.sticker} size={26} />
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <NameAndDiet name={name} setName={setName} diet={diet} setDiet={setDiet} />
      <SubmitButton busy={busy} disabled={!item.trim() || !name.trim()}>Add it</SubmitButton>
    </form>
  );
}
