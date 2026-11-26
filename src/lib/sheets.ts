import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { STICKERS, type StickerKey } from "./stickers";
import { CATEGORY_COLORS, type CategoryColor, type Sheet } from "./types";

type ClaimRow = { id: string; guest_name: string; detail: string | null; dietary_note: string | null; created_at: string };
type SlotRow = {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  sticker: string | null;
  position: number;
  created_by_guest: boolean;
  claims: ClaimRow[];
};
type CategoryRow = { id: string; name: string; sticker: string; color: string | null; position: number; slots: SlotRow[] };
type SheetRow = {
  id: string;
  slug: string;
  title: string;
  host_name: string;
  starts_at: string;
  time_zone: string;
  location: string | null;
  host_note: string | null;
  partiful_url: string | null;
  allow_guest_items: boolean;
  categories: CategoryRow[];
};

function sticker(key: string | null | undefined): StickerKey | undefined {
  return key && key in STICKERS ? (key as StickerKey) : undefined;
}

function color(c: string | null): CategoryColor | undefined {
  return CATEGORY_COLORS.includes(c as CategoryColor) ? (c as CategoryColor) : undefined;
}

/**
 * Public view of a sheet for the guest page. Deliberately excludes guest emails and edit tokens.
 */
export async function getSheetBySlug(slug: string): Promise<Sheet | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;

  const { data, error } = await supabaseAdmin()
    .from("sheets")
    .select(
      `id, slug, title, host_name, starts_at, time_zone, location, host_note, partiful_url, allow_guest_items,
       categories ( id, name, sticker, color, position,
         slots ( id, name, quantity, note, sticker, position, created_by_guest, created_at,
           claims ( id, guest_name, detail, dietary_note, created_at ) ) )`,
    )
    .eq("slug", slug)
    .maybeSingle<SheetRow>();

  if (error) throw error;
  if (!data) return null;

  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
  const categories = [...data.categories].sort(byPos);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    hostName: data.host_name,
    startsAt: data.starts_at,
    timeZone: data.time_zone,
    location: data.location ?? undefined,
    hostNote: data.host_note ?? undefined,
    partifulUrl: data.partiful_url ?? undefined,
    allowGuestItems: data.allow_guest_items,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sticker: sticker(c.sticker) ?? "plate",
      color: color(c.color),
      slots: [...c.slots].sort(byPos).map((s) => ({
        id: s.id,
        name: s.name,
        quantity: s.quantity,
        note: s.note ?? undefined,
        sticker: sticker(s.sticker),
        createdByGuest: s.created_by_guest,
      })),
    })),
    claims: categories
      .flatMap((c) => c.slots.flatMap((s) => s.claims.map((cl) => ({ ...cl, slotId: s.id }))))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((cl) => ({
        id: cl.id,
        slotId: cl.slotId,
        guestName: cl.guest_name,
        detail: cl.detail ?? undefined,
        dietaryNote: cl.dietary_note ?? undefined,
      })),
  };
}
