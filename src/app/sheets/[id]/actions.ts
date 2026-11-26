"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { fromLocalInput, isValidTimeZone } from "@/lib/dates";
import { guessSticker, isSticker } from "@/lib/stickers";
import { CATEGORY_COLORS, type CategoryColor } from "@/lib/types";

// All writes run as the signed-in host, so Row Level Security limits them to the host's own sheets.

export type DraftSlot = { id: string; name: string; quantity: number; note?: string };
export type DraftCategory = { id: string; name: string; sticker: string; color?: CategoryColor; slots: DraftSlot[] };
export type Details = {
  title: string;
  hostName: string;
  startsAt: string; // datetime-local, in timeZone
  timeZone: string;
  location: string;
  hostNote: string;
  partifulUrl: string;
  allowGuestItems: boolean;
};
type Result = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Loads the sheet (RLS: only if this host owns it) with its category/slot ids for diffing. */
async function ownedSheet(sheetId: string) {
  if (!UUID.test(sheetId)) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("sheets")
    .select("id, slug, categories ( id, position, slots ( id, name, sticker ) )")
    .eq("id", sheetId)
    .maybeSingle<{
      id: string;
      slug: string;
      categories: { id: string; position: number; slots: { id: string; name: string; sticker: string | null }[] }[];
    }>();
  return data ? { supabase, sheet: data } : null;
}

function refresh(sheetId: string, slug: string) {
  revalidatePath(`/sheets/${sheetId}`);
  revalidatePath(`/s/${slug}`);
  revalidatePath("/dashboard");
}

/** Create or update one category card and its items. Items removed from the card are deleted. */
export async function saveCategory(sheetId: string, cat: DraftCategory): Promise<Result> {
  const owned = await ownedSheet(sheetId);
  if (!owned) return { error: "Couldn't find that party." };
  const { supabase, sheet } = owned;

  const name = clean(cat.name, 40);
  const slots = (Array.isArray(cat.slots) ? cat.slots : []).filter((s) => clean(s.name, 80)).slice(0, 60);
  if (!UUID.test(cat.id) || !slots.every((s) => UUID.test(s.id))) return { error: "Something went wrong. Reload and try again." };
  if (!name) return { error: "Give this category a name." };

  const existing = sheet.categories.find((c) => c.id === cat.id);
  const position = existing?.position ?? Math.max(0, ...sheet.categories.map((c) => c.position)) + 1;
  const oldSlots = new Map((existing?.slots ?? []).map((s) => [s.id, s]));

  const c = await supabase.from("categories").upsert({
    id: cat.id,
    sheet_id: sheetId,
    name,
    sticker: isSticker(cat.sticker) ? cat.sticker : (guessSticker(name) ?? "plate"),
    color: cat.color && CATEGORY_COLORS.includes(cat.color) ? cat.color : null,
    position,
  });
  if (c.error) return { error: "Couldn't save. Try again?" };

  const keep = new Set(slots.map((s) => s.id));
  const removed = [...oldSlots.keys()].filter((id) => !keep.has(id));
  if (removed.length) await supabase.from("slots").delete().in("id", removed);

  if (slots.length) {
    const s = await supabase.from("slots").upsert(
      slots.map((s, j) => {
        const slotName = clean(s.name, 80);
        const prev = oldSlots.get(s.id);
        return {
          id: s.id,
          category_id: cat.id,
          name: slotName,
          quantity: Math.min(50, Math.max(1, Math.round(Number(s.quantity) || 1))),
          note: clean(s.note, 140) || null,
          // Keep an item's sticker unless it was renamed; otherwise guess from the name.
          sticker: prev && prev.name === slotName ? prev.sticker : (guessSticker(slotName) ?? null),
          position: j + 1,
        };
      }),
    );
    if (s.error) return { error: "Couldn't save the items. Try again?" };
  }

  refresh(sheetId, sheet.slug);
  return {};
}

export async function deleteCategory(sheetId: string, categoryId: string): Promise<Result> {
  const owned = await ownedSheet(sheetId);
  if (!owned || !UUID.test(categoryId)) return { error: "Couldn't find that category." };
  if (owned.sheet.categories.length <= 1) return { error: "A party needs at least one category." };
  const { error } = await owned.supabase.from("categories").delete().eq("id", categoryId).eq("sheet_id", sheetId);
  if (error) return { error: "Couldn't delete. Try again?" };
  refresh(sheetId, owned.sheet.slug);
  return {};
}

/** Saves a new card order (array of category ids, top to bottom). */
export async function reorderCategories(sheetId: string, orderedIds: string[]): Promise<Result> {
  const owned = await ownedSheet(sheetId);
  if (!owned) return { error: "Couldn't find that party." };
  const mine = new Set(owned.sheet.categories.map((c) => c.id));
  const ids = orderedIds.filter((id) => mine.has(id));
  for (let i = 0; i < ids.length; i++) {
    const { error } = await owned.supabase.from("categories").update({ position: i + 1 }).eq("id", ids[i]);
    if (error) return { error: "Couldn't reorder. Try again?" };
  }
  refresh(sheetId, owned.sheet.slug);
  return {};
}

export async function saveDetails(sheetId: string, d: Details): Promise<Result> {
  const owned = await ownedSheet(sheetId);
  if (!owned) return { error: "Couldn't find that party." };

  const title = clean(d.title, 80);
  const hostName = clean(d.hostName, 60);
  const timeZone = isValidTimeZone(d.timeZone) ? d.timeZone : "America/New_York";
  const startsAt = fromLocalInput(d.startsAt, timeZone);
  const partifulUrl = clean(d.partifulUrl, 300);
  if (!title) return { error: "Give your party a name." };
  if (!hostName) return { error: "Add your name so guests know who's hosting." };
  if (!startsAt) return { error: "When's the party?" };
  if (partifulUrl && !/^https:\/\/\S+$/.test(partifulUrl)) return { error: "The invite link should start with https://" };

  const { error } = await owned.supabase
    .from("sheets")
    .update({
      title,
      host_name: hostName,
      starts_at: startsAt,
      time_zone: timeZone,
      location: clean(d.location, 120) || null,
      host_note: typeof d.hostNote === "string" ? d.hostNote.trim().slice(0, 500) || null : null,
      partiful_url: partifulUrl || null,
      allow_guest_items: Boolean(d.allowGuestItems),
    })
    .eq("id", sheetId);
  if (error) return { error: "Couldn't save. Try again?" };

  await owned.supabase.auth.updateUser({ data: { name: hostName } });
  refresh(sheetId, owned.sheet.slug);
  return {};
}

export async function deleteSheet(sheetId: string) {
  const owned = await ownedSheet(sheetId);
  if (owned) await owned.supabase.from("sheets").delete().eq("id", sheetId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
