"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { fromLocalInput, isValidTimeZone } from "@/lib/dates";
import { guessSticker, isSticker } from "@/lib/stickers";
import { CATEGORY_COLORS, type CategoryColor } from "@/lib/types";

export type DraftSlot = { id: string; name: string; quantity: number; note?: string };
export type DraftCategory = { id: string; name: string; sticker: string; color?: CategoryColor; slots: DraftSlot[] };
export type Draft = {
  title: string;
  hostName: string;
  startsAt: string; // datetime-local, in timeZone
  timeZone: string;
  location: string;
  hostNote: string;
  partifulUrl: string;
  allowGuestItems: boolean;
  categories: DraftCategory[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function saveSheet(sheetId: string, draft: Draft): Promise<{ error?: string }> {
  if (!UUID.test(sheetId)) return { error: "Couldn't find that party." };
  const supabase = await supabaseServer();

  // Ownership: RLS only returns the sheet if this host owns it.
  const { data: existing } = await supabase
    .from("sheets")
    .select("id, slug, categories ( id, slots ( id, name, sticker ) )")
    .eq("id", sheetId)
    .maybeSingle<{ id: string; slug: string; categories: { id: string; slots: { id: string; name: string; sticker: string | null }[] }[] }>();
  if (!existing) return { error: "Couldn't find that party." };

  const title = clean(draft.title, 80);
  const hostName = clean(draft.hostName, 60);
  const timeZone = isValidTimeZone(draft.timeZone) ? draft.timeZone : "America/New_York";
  const startsAt = fromLocalInput(draft.startsAt, timeZone);
  const partifulUrl = clean(draft.partifulUrl, 300);
  if (!title) return { error: "Give your party a name." };
  if (!hostName) return { error: "Add your name so guests know who's hosting." };
  if (!startsAt) return { error: "When's the party?" };
  if (partifulUrl && !/^https:\/\/\S+$/.test(partifulUrl)) return { error: "The invite link should start with https://" };

  const cats = (Array.isArray(draft.categories) ? draft.categories : []).slice(0, 20);
  if (!cats.length) return { error: "Add at least one category." };
  for (const c of cats) {
    if (!UUID.test(c.id) || !c.slots.every((s) => UUID.test(s.id))) return { error: "Something went wrong. Reload and try again." };
    if (!clean(c.name, 40)) return { error: "Every category needs a name." };
    if (c.slots.some((s) => !clean(s.name, 80))) return { error: `An item in ${clean(c.name, 40)} is missing a name.` };
  }

  const oldSlots = new Map(existing.categories.flatMap((c) => c.slots).map((s) => [s.id, s]));
  const keepCats = new Set(cats.map((c) => c.id));
  const keepSlots = new Set(cats.flatMap((c) => c.slots.map((s) => s.id)));

  const sheetUpdate = await supabase
    .from("sheets")
    .update({
      title,
      host_name: hostName,
      starts_at: startsAt,
      time_zone: timeZone,
      location: clean(draft.location, 120) || null,
      host_note: typeof draft.hostNote === "string" ? draft.hostNote.trim().slice(0, 500) || null : null,
      partiful_url: partifulUrl || null,
      allow_guest_items: Boolean(draft.allowGuestItems),
    })
    .eq("id", sheetId);
  if (sheetUpdate.error) return { error: "Couldn't save. Try again?" };

  // Remove what the host deleted (claims on removed items go with them).
  const removedSlots = [...oldSlots.keys()].filter((id) => !keepSlots.has(id));
  const removedCats = existing.categories.map((c) => c.id).filter((id) => !keepCats.has(id));
  if (removedSlots.length) await supabase.from("slots").delete().in("id", removedSlots);
  if (removedCats.length) await supabase.from("categories").delete().in("id", removedCats);

  const catRows = cats.map((c, i) => ({
    id: c.id,
    sheet_id: sheetId,
    name: clean(c.name, 40),
    sticker: isSticker(c.sticker) ? c.sticker : (guessSticker(c.name) ?? "plate"),
    color: c.color && CATEGORY_COLORS.includes(c.color) ? c.color : null,
    position: i + 1,
  }));
  const slotRows = cats.flatMap((c) =>
    c.slots.slice(0, 60).map((s, j) => {
      const name = clean(s.name, 80);
      const prev = oldSlots.get(s.id);
      return {
        id: s.id,
        category_id: c.id,
        name,
        quantity: Math.min(50, Math.max(1, Math.round(Number(s.quantity) || 1))),
        note: clean(s.note, 140) || null,
        // Keep a sticker the item already had unless it was renamed; otherwise guess from the name.
        sticker: prev && prev.name === name ? prev.sticker : (guessSticker(name) ?? null),
        position: j + 1,
      };
    }),
  );

  const c = await supabase.from("categories").upsert(catRows);
  const s = c.error ? c : await supabase.from("slots").upsert(slotRows);
  if (c.error || s.error) return { error: "Couldn't save the list. Try again?" };

  if (title) await supabase.auth.updateUser({ data: { name: hostName } });
  revalidatePath(`/sheets/${sheetId}`);
  revalidatePath(`/s/${existing.slug}`);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteSheet(sheetId: string) {
  if (!UUID.test(sheetId)) return;
  const supabase = await supabaseServer();
  await supabase.from("sheets").delete().eq("id", sheetId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
