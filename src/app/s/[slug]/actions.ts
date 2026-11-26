"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type GuestInput = { guestName: string; detail?: string; dietaryNote?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{3,40}$/;

/** Trim, collapse whitespace, cap length; empty → undefined. */
function clean(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.replace(/\s+/g, " ").trim().slice(0, max);
  return t || undefined;
}

function friendly(message: string): string {
  if (message.includes("slot_full")) return "Someone just grabbed that one. Pick another?";
  if (message.includes("not_found")) return "That item isn't on this sheet anymore.";
  return "Something went wrong. Try again?";
}

export async function claimSlot(
  slug: string,
  slotId: string,
  input: GuestInput,
): Promise<ActionResult<{ claimId: string; editToken: string }>> {
  const guestName = clean(input.guestName, 60);
  if (!SLUG.test(slug) || !UUID.test(slotId)) return { ok: false, error: "That item isn't on this sheet anymore." };
  if (!guestName) return { ok: false, error: "Add your name so the host knows who's bringing it." };

  const { data, error } = await supabaseAdmin()
    .rpc("claim_slot", {
      p_slug: slug,
      p_slot_id: slotId,
      p_guest_name: guestName,
      p_detail: clean(input.detail, 80) ?? null,
      p_dietary_note: clean(input.dietaryNote, 120) ?? null,
    })
    .single<{ claim_id: string; edit_token: string }>();

  if (error || !data) return { ok: false, error: friendly(error?.message ?? "") };
  revalidatePath(`/s/${slug}`);
  return { ok: true, data: { claimId: data.claim_id, editToken: data.edit_token } };
}

export async function addGuestItem(
  slug: string,
  categoryId: string,
  itemName: string,
  input: Omit<GuestInput, "detail">,
): Promise<ActionResult<{ slotId: string; claimId: string; editToken: string }>> {
  const guestName = clean(input.guestName, 60);
  const name = clean(itemName, 80);
  if (!SLUG.test(slug) || !UUID.test(categoryId)) return { ok: false, error: "That category isn't on this sheet." };
  if (!name) return { ok: false, error: "What are you bringing?" };
  if (!guestName) return { ok: false, error: "Add your name so the host knows who's bringing it." };

  const { data, error } = await supabaseAdmin()
    .rpc("add_guest_item", {
      p_slug: slug,
      p_category_id: categoryId,
      p_item_name: name,
      p_guest_name: guestName,
      p_dietary_note: clean(input.dietaryNote, 120) ?? null,
    })
    .single<{ slot_id: string; claim_id: string; edit_token: string }>();

  if (error || !data) return { ok: false, error: friendly(error?.message ?? "") };
  revalidatePath(`/s/${slug}`);
  return { ok: true, data: { slotId: data.slot_id, claimId: data.claim_id, editToken: data.edit_token } };
}

export async function dropClaim(slug: string, claimId: string, editToken: string): Promise<ActionResult<null>> {
  if (!SLUG.test(slug) || !UUID.test(claimId) || !UUID.test(editToken)) {
    return { ok: false, error: "Couldn't find that claim." };
  }
  const { data, error } = await supabaseAdmin().rpc("drop_claim", { p_claim_id: claimId, p_edit_token: editToken });
  if (error) return { ok: false, error: friendly(error.message) };
  if (!data) return { ok: false, error: "Couldn't find that claim. It may already be removed." };
  revalidatePath(`/s/${slug}`);
  return { ok: true, data: null };
}
