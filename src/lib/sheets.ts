import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";
import { guessSticker, isSticker, type StickerKey } from "./stickers";
import { CATEGORY_COLORS, takenCount, type CategoryColor, type Sheet } from "./types";

type ClaimRow = { id: string; guest_name: string; quantity: number; detail: string | null; dietary_note: string | null; created_at: string };
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

function sticker(key: string | null | undefined, name: string): StickerKey | undefined {
  return isSticker(key) ? key : guessSticker(name);
}

function color(c: string | null): CategoryColor | undefined {
  return CATEGORY_COLORS.includes(c as CategoryColor) ? (c as CategoryColor) : undefined;
}

// Never select guest_email or edit_token here: this shape is sent to browsers.
const SHEET_SELECT = `id, slug, title, host_name, starts_at, time_zone, location, host_note, partiful_url, allow_guest_items,
  categories ( id, name, sticker, color, position,
    slots ( id, name, quantity, note, sticker, position, created_by_guest, created_at,
      claims ( id, guest_name, quantity, detail, dietary_note, created_at ) ) )`;

/** Public view of a sheet for the guest page (server key; anyone with the link). */
export async function getSheetBySlug(slug: string): Promise<Sheet | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const { data, error } = await supabaseAdmin().from("sheets").select(SHEET_SELECT).eq("slug", slug).maybeSingle<SheetRow>();
  if (error) throw error;
  return data ? mapSheet(data) : null;
}

/** A sheet the signed-in host owns (RLS enforces ownership). */
export async function getHostSheet(id: string): Promise<Sheet | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("sheets").select(SHEET_SELECT).eq("id", id).maybeSingle<SheetRow>();
  if (error) throw error;
  return data ? mapSheet(data) : null;
}

/** All of the signed-in host's sheets, soonest first, with simple counts. */
export async function listHostSheets() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("sheets")
    .select("id, slug, title, starts_at, time_zone, location, categories ( sticker, position, slots ( quantity, claims ( quantity ) ) )")
    .order("starts_at", { ascending: true })
    .returns<
      { id: string; slug: string; title: string; starts_at: string; time_zone: string; location: string | null;
        categories: { sticker: string; position: number; slots: { quantity: number; claims: { quantity: number }[] }[] }[] }[]
    >();
  if (error) throw error;
  return data.map((s) => {
    const slots = s.categories.flatMap((c) => c.slots);
    const first = [...s.categories].sort((a, b) => a.position - b.position)[0];
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      startsAt: s.starts_at,
      timeZone: s.time_zone,
      location: s.location ?? undefined,
      sticker: (isSticker(first?.sticker) ? first.sticker : "party") as StickerKey,
      needed: slots.reduce((n, sl) => n + Math.max(0, sl.quantity - takenCount(sl.claims)), 0),
      claimed: slots.reduce((n, sl) => n + takenCount(sl.claims), 0),
    };
  });
}

function mapSheet(data: SheetRow): Sheet {

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
      sticker: sticker(c.sticker, c.name) ?? "plate",
      color: color(c.color),
      slots: [...c.slots].sort(byPos).map((s) => ({
        id: s.id,
        name: s.name,
        quantity: s.quantity,
        note: s.note ?? undefined,
        sticker: sticker(s.sticker, s.name),
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
        quantity: cl.quantity,
        detail: cl.detail ?? undefined,
        dietaryNote: cl.dietary_note ?? undefined,
      })),
  };
}

type ClaimPair = { claim_id: string; edit_token: string };

function toMine(rows: ClaimPair[] | null): Record<string, string> {
  return Object.fromEntries((rows ?? []).map((r) => [r.claim_id, r.edit_token]));
}

/** Claims on this sheet whose edit tokens were supplied. Empty on any error. */
export async function resolveEditTokens(slug: string, tokens: string[]): Promise<Record<string, string>> {
  if (!tokens.length) return {};
  const { data, error } = await supabaseAdmin().rpc("resolve_edit_tokens", { p_slug: slug, p_tokens: tokens });
  return error ? {} : toMine(data as ClaimPair[] | null);
}

/** Every current claim on this sheet saved under the guest link's email. Empty on any error. */
export async function resolveGuestLink(slug: string, token: string | null): Promise<Record<string, string>> {
  if (!token) return {};
  const { data, error } = await supabaseAdmin().rpc("resolve_guest_link", { p_slug: slug, p_token: token });
  return error ? {} : toMine(data as ClaimPair[] | null);
}

export type GuestLinkResult =
  | { status: "send"; linkId: string; linkToken: string; guestEmail: string; title: string; hostName: string; startsAt: string; timeZone: string }
  | { status: "linked" | "none" };

/** Decide whether this claim's guest link email should go out (reserves the one send). */
export async function claimGuestLink(slug: string, claimId: string, editToken: string): Promise<GuestLinkResult> {
  const { data, error } = await supabaseAdmin()
    .rpc("claim_guest_link", { p_slug: slug, p_claim_id: claimId, p_edit_token: editToken })
    .single<{
      status: string;
      link_id: string | null;
      link_token: string | null;
      guest_email: string | null;
      sheet_title: string | null;
      host_name: string | null;
      starts_at: string | null;
      time_zone: string | null;
    }>();
  if (error || !data) return { status: "none" };
  if (data.status === "linked") return { status: "linked" };
  if (data.status !== "send" || !data.link_id || !data.link_token || !data.guest_email || !data.sheet_title || !data.host_name || !data.starts_at || !data.time_zone) {
    return { status: "none" };
  }
  return {
    status: "send",
    linkId: data.link_id,
    linkToken: data.link_token,
    guestEmail: data.guest_email,
    title: data.sheet_title,
    hostName: data.host_name,
    startsAt: data.starts_at,
    timeZone: data.time_zone,
  };
}

export async function markGuestLinkSent(linkId: string): Promise<void> {
  await supabaseAdmin().rpc("mark_guest_link_sent", { p_link_id: linkId });
}
