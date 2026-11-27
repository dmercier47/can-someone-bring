"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, reorderCategories, saveCategory, type DraftCategory } from "./actions";
import { categoryColor, takenCount, type Category, type Claim } from "@/lib/types";
import { guessSticker, isSticker } from "@/lib/stickers";
import { uuid } from "@/lib/uuid";
import Sticker from "@/components/Sticker";
import { ui } from "@/components/ui";
import { CARD_BG, IconButton, Stepper, StylePicker } from "@/components/editor";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";

type Props = { sheetId: string; categories: Category[]; claims: Claim[] };

const toDraft = (c: Category): DraftCategory => ({
  id: c.id,
  name: c.name,
  sticker: c.sticker,
  color: c.color,
  slots: c.slots.map((s) => ({ id: s.id, name: s.name, quantity: s.quantity, note: s.note })),
});

export default function HostBoard({ sheetId, categories, claims }: Props) {
  const router = useRouter();
  // At most one band is edited at a time; `draft` holds its unsaved changes.
  const [editing, setEditing] = useState<{ draft: DraftCategory; isNew: boolean; dirty: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState(categories.map((c) => c.id));

  // Adopt fresh server data (after saves, or when someone claims something).
  useEffect(() => setOrder(categories.map((c) => c.id)), [categories]);

  const claimsBySlot = new Map<string, Claim[]>();
  for (const c of claims) claimsBySlot.set(c.slotId, [...(claimsBySlot.get(c.slotId) ?? []), c]);
  const claimCount = (slotId: string) => takenCount(claimsBySlot.get(slotId) ?? []);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Category[];

  function startEditing(cat: Category | null) {
    if (editing?.dirty && !confirm("Discard your unsaved changes to this category?")) return;
    setError(null);
    setEditing(
      cat
        ? { draft: toDraft(cat), isNew: false, dirty: false }
        : { draft: { id: uuid(), name: "", sticker: "plate", slots: [{ id: uuid(), name: "", quantity: 1 }] }, isNew: true, dirty: false },
    );
  }

  function cancel() {
    if (editing?.dirty && !confirm("Discard your unsaved changes?")) return;
    setEditing(null);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await saveCategory(sheetId, editing.draft);
    setSaving(false);
    if (res.error) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function remove(cat: DraftCategory) {
    const n = cat.slots.reduce((sum, s) => sum + claimCount(s.id), 0);
    const msg = n > 0 ? `Remove “${cat.name}” and its ${n} claim${n === 1 ? "" : "s"}?` : `Remove “${cat.name || "this category"}”?`;
    if (!confirm(msg)) return;
    setSaving(true);
    const res = await deleteCategory(sheetId, cat.id);
    setSaving(false);
    if (res.error) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next); // optimistic
    const res = await reorderCategories(sheetId, next);
    if (res.error) setError(res.error);
    router.refresh();
  }

  const newBand = editing?.isNew ? editing : null;
  // While editing, the band gets an inset ink outline so it's obvious which one you're changing.
  const editingRing = "relative z-10 shadow-[inset_0_0_0_2px_var(--cat-ink)]";

  return (
    <div className="-mx-4 sm:mx-0 sm:grid sm:gap-3">
      {ordered.map((cat, idx) => {
        const isEditing = editing && !editing.isNew && editing.draft.id === cat.id;
        const color = categoryColor(isEditing ? editing.draft : cat, idx);
        return (
          <section
            key={cat.id}
            className={`group px-5 pt-5 pb-3 text-cat-ink sm:rounded-[20px] ${CARD_BG[color]} ${isEditing ? editingRing : ""}`}
          >
            {isEditing ? (
              <BandEditor
                key={cat.id}
                state={editing}
                index={idx}
                canMoveUp={idx > 0}
                canMoveDown={idx < ordered.length - 1}
                claimCount={claimCount}
                saving={saving}
                error={error}
                onChange={(draft) => setEditing({ ...editing, draft, dirty: true })}
                onMove={(dir) => move(cat.id, dir)}
                onDelete={() => remove(editing.draft)}
                onCancel={cancel}
                onSave={save}
              />
            ) : (
              <BandView cat={cat} claimsBySlot={claimsBySlot} onEdit={() => startEditing(cat)} />
            )}
          </section>
        );
      })}

      {newBand ? (
        <section className={`px-5 pt-5 pb-3 text-cat-ink sm:rounded-[20px] ${CARD_BG[categoryColor(newBand.draft, ordered.length)]} ${editingRing}`}>
          <BandEditor
            state={newBand}
            index={ordered.length}
            claimCount={claimCount}
            saving={saving}
            error={error}
            onChange={(draft) => setEditing({ ...newBand, draft, dirty: true })}
            onCancel={cancel}
            onSave={save}
          />
        </section>
      ) : (
        <div className="px-4 pt-4 sm:px-0 sm:pt-0">
          <button type="button" onClick={() => startEditing(null)} className={`${ui.ghost} h-14 w-full text-[15px] text-muted`}>
            <PlusIcon size={18} />
            Add a category
          </button>
        </div>
      )}
    </div>
  );
}

function BandView({ cat, claimsBySlot, onEdit }: { cat: Category; claimsBySlot: Map<string, Claim[]>; onEdit: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2.5 pb-2">
        <Sticker name={cat.sticker} size={36} className="-ml-0.5" />
        <h2 className="flex-1 font-display text-[24px] tracking-[-0.015em]">{cat.name}</h2>
        {/* Pencil: always visible on touch screens (no hover there); appears on hover/focus with a mouse. */}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${cat.name}`}
          title={`Edit ${cat.name}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/45 transition-opacity focus-visible:opacity-100 active:bg-white/80 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:hover:bg-white/80"
        >
          <PencilIcon size={17} />
        </button>
      </div>
      <ul>
        {cat.slots.map((slot) => {
          const cl = claimsBySlot.get(slot.id) ?? [];
          const open = slot.quantity - takenCount(cl);
          const who = cl.map((c) => {
            const person = c.quantity > 1 ? `${c.guestName} ×${c.quantity}` : c.guestName;
            return c.detail ? `${person}: ${c.detail}` : person;
          });
          const sub = [...(slot.quantity > 1 ? [`${slot.quantity} needed`] : []), ...who, ...(slot.createdByGuest ? ["added by a guest"] : [])].join(" · ");
          return (
            <li key={slot.id} className="flex min-h-14 items-center gap-3 border-t border-cat-hair py-2.5">
              <div className="min-w-0 flex-1">
                <p className={`text-[16px] leading-snug ${open > 0 ? "" : "text-cat-muted"}`}>{slot.name}</p>
                {sub && <p className="text-[13px] leading-snug text-cat-muted">{sub}</p>}
              </div>
              {open > 0 ? (
                <span className="shrink-0 text-[13px] text-cat-muted">{open} open</span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-[13px] text-cat-muted">
                  <CheckIcon size={15} />
                  Covered
                </span>
              )}
            </li>
          );
        })}
        {cat.slots.length === 0 && <li className="border-t border-cat-hair py-3 text-[14px] text-cat-muted">No items yet</li>}
      </ul>
    </>
  );
}

function BandEditor({
  state,
  index,
  canMoveUp,
  canMoveDown,
  claimCount,
  saving,
  error,
  onChange,
  onMove,
  onDelete,
  onCancel,
  onSave,
}: {
  state: { draft: DraftCategory; isNew: boolean };
  index: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  claimCount: (slotId: string) => number;
  saving: boolean;
  error: string | null;
  onChange: (d: DraftCategory) => void;
  onMove?: (dir: -1 | 1) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const d = state.draft;
  const [styling, setStyling] = useState(false);
  const focusId = useRef<string | null>(state.isNew ? `cat-${d.id}` : null);

  // Focus the category name for a new band, or a just-added item.
  useEffect(() => {
    if (!focusId.current) return;
    document.getElementById(focusId.current)?.focus();
    focusId.current = null;
  });

  const setSlot = (id: string, patch: Partial<DraftCategory["slots"][number]>) =>
    onChange({ ...d, slots: d.slots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  function addSlot() {
    const id = uuid();
    focusId.current = `slot-${id}`;
    onChange({ ...d, slots: [...d.slots, { id, name: "", quantity: 1 }] });
  }

  function removeSlot(id: string, name: string) {
    const n = claimCount(id);
    if (n > 0 && !confirm(`${n === 1 ? "Someone has" : `${n} people have`} claimed “${name}”. Remove it anyway?`)) return;
    onChange({ ...d, slots: d.slots.filter((s) => s.id !== id) });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="flex items-center gap-1.5 pb-3">
        <button
          type="button"
          onClick={() => setStyling(true)}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/45"
          aria-label={`Change sticker and color for ${d.name || "category"}`}
          title="Change sticker and color"
        >
          <Sticker name={isSticker(d.sticker) ? d.sticker : "plate"} size={32} />
        </button>
        <input
          id={`cat-${d.id}`}
          className="h-11 w-0 min-w-0 flex-1 rounded-xl bg-white/45 px-3 font-display text-[20px] tracking-[-0.01em] outline-none placeholder:text-cat-muted focus:bg-white/75"
          value={d.name}
          onChange={(e) => {
            const name = e.target.value;
            onChange({ ...d, name, sticker: d.sticker === "plate" ? (guessSticker(name) ?? "plate") : d.sticker });
          }}
          onKeyDown={(e) => {
            // Enter moves on to the items instead of saving the band.
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (d.slots[0]) document.getElementById(`slot-${d.slots[0].id}`)?.focus();
            else addSlot();
          }}
          placeholder="Category name"
          maxLength={40}
          aria-label="Category name"
          enterKeyHint="next"
        />
        {onMove && (
          <>
            <IconButton label="Move up" onClick={() => onMove(-1)} disabled={!canMoveUp}>
              <ChevronUpIcon />
            </IconButton>
            <IconButton label="Move down" onClick={() => onMove(1)} disabled={!canMoveDown}>
              <ChevronDownIcon />
            </IconButton>
          </>
        )}
      </div>

      <ul>
        {d.slots.map((slot) => (
          <li key={slot.id} className="flex items-center gap-1 border-t border-cat-hair py-1.5">
            <div className="flex w-0 min-w-0 flex-1 flex-col">
              <input
                id={`slot-${slot.id}`}
                className={`-ml-2.5 w-full rounded-xl bg-transparent px-2.5 text-[16px] outline-none placeholder:text-cat-muted focus:bg-white/70 ${
                  claimCount(slot.id) > 0 ? "h-8 pt-1" : "h-11"
                }`}
                value={slot.name}
                onChange={(e) => setSlot(slot.id, { name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSlot();
                  }
                }}
                placeholder="Item, e.g. a salad"
                maxLength={80}
                aria-label="Item name"
                enterKeyHint="next"
              />
              {claimCount(slot.id) > 0 && <span className="pb-1 text-[12px] text-cat-muted">{claimCount(slot.id)} claimed</span>}
            </div>
            <Stepper value={slot.quantity} onChange={(q) => setSlot(slot.id, { quantity: q })} />
            <IconButton label={`Remove ${slot.name || "item"}`} onClick={() => removeSlot(slot.id, slot.name)}>
              <CloseIcon size={17} />
            </IconButton>
          </li>
        ))}
        <li className="border-t border-cat-hair">
          <button type="button" onClick={addSlot} className="flex h-12 items-center gap-1.5 text-[14px]">
            <PlusIcon size={16} />
            Add an item
          </button>
        </li>
      </ul>

      {error && <p className="mt-2 border-l-2 border-cat-ink pl-3 text-[14px]">{error}</p>}

      <div className="mt-3 flex items-center gap-2 border-t border-cat-hair pt-3">
        {onDelete && (
          <button type="button" onClick={onDelete} disabled={saving} className="flex h-10 items-center gap-1.5 pr-2 text-[14px] text-cat-muted">
            <TrashIcon size={16} />
            Delete
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={onCancel} disabled={saving} className="h-10 rounded-full border border-cat-hair px-4 text-[14px]">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-10 rounded-full bg-cat-ink px-5 text-[14px] text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {styling && (
        <StylePicker
          name={d.name}
          sticker={d.sticker}
          color={d.color}
          index={index}
          onClose={() => setStyling(false)}
          onChange={(patch) => onChange({ ...d, ...patch, ...("color" in patch ? { color: patch.color } : {}) })}
        />
      )}
    </form>
  );
}
