"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { claimGuestLink, markGuestLinkSent } from "@/lib/sheets";
import { guestLinkEmail, sendEmail } from "@/lib/mail";
import { normalizeEmail } from "@/lib/email";
import { guestLinkUrl } from "@/lib/edit-link";
import { whenPhrase } from "@/lib/dates";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type GuestInput = { guestName: string; detail?: string; dietaryNote?: string; quantity?: number; guestEmail?: string };

const EMAIL_ERROR = "That email looks off.";

/** Blank → null (no email); invalid → undefined; otherwise the normalized address. */
function parseEmail(raw: unknown): string | null | undefined {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return normalizeEmail(raw) ?? undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{3,40}$/;

/** Trim, collapse whitespace, cap length; empty → undefined. */
function clean(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.replace(/\s+/g, " ").trim().slice(0, max);
  return t || undefined;
}

function friendly(message: string): string {
  if (message.includes("slot_full")) return "Someone beat you to it. Pick another, or bring fewer?";
  if (message.includes("not_found")) return "That item isn't on this sheet anymore.";
  return "Something went wrong. Try again?";
}

export async function claimSlot(
  slug: string,
  slotId: string,
  input: GuestInput,
): Promise<ActionResult<{ claimId: string; editToken: string; emailed: boolean }>> {
  const guestName = clean(input.guestName, 60);
  if (!SLUG.test(slug) || !UUID.test(slotId)) return { ok: false, error: "That item isn't on this sheet anymore." };
  if (!guestName) return { ok: false, error: "Add your name so the host knows who's bringing it." };
  const count = Number.isInteger(input.quantity) ? (input.quantity as number) : 1;
  if (count < 1 || count > 50) return { ok: false, error: "Pick how many you're bringing." };
  const email = parseEmail(input.guestEmail);
  if (email === undefined) return { ok: false, error: EMAIL_ERROR };

  const { data, error } = await supabaseAdmin()
    .rpc("claim_slot", {
      p_count: count,
      p_slug: slug,
      p_slot_id: slotId,
      p_guest_name: guestName,
      p_detail: clean(input.detail, 80) ?? null,
      p_dietary_note: clean(input.dietaryNote, 120) ?? null,
      p_guest_email: email,
    })
    .single<{ claim_id: string; edit_token: string }>();

  if (error || !data) return { ok: false, error: friendly(error?.message ?? "") };
  revalidatePath(`/s/${slug}`);
  return { ok: true, data: { claimId: data.claim_id, editToken: data.edit_token, emailed: email !== null } };
}

export async function addGuestItem(
  slug: string,
  categoryId: string,
  itemName: string,
  input: Omit<GuestInput, "detail">,
): Promise<ActionResult<{ slotId: string; claimId: string; editToken: string; emailed: boolean }>> {
  const guestName = clean(input.guestName, 60);
  const name = clean(itemName, 80);
  if (!SLUG.test(slug) || !UUID.test(categoryId)) return { ok: false, error: "That category isn't on this sheet." };
  if (!name) return { ok: false, error: "What are you bringing?" };
  if (!guestName) return { ok: false, error: "Add your name so the host knows who's bringing it." };
  const email = parseEmail(input.guestEmail);
  if (email === undefined) return { ok: false, error: EMAIL_ERROR };

  const { data, error } = await supabaseAdmin()
    .rpc("add_guest_item", {
      p_slug: slug,
      p_category_id: categoryId,
      p_item_name: name,
      p_guest_name: guestName,
      p_dietary_note: clean(input.dietaryNote, 120) ?? null,
      p_guest_email: email,
    })
    .single<{ slot_id: string; claim_id: string; edit_token: string }>();

  if (error || !data) return { ok: false, error: friendly(error?.message ?? "") };
  revalidatePath(`/s/${slug}`);
  return { ok: true, data: { slotId: data.slot_id, claimId: data.claim_id, editToken: data.edit_token, emailed: email !== null } };
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

/**
 * Called by the browser right after a claim with an email. Sends at most one guest-link email per
 * guest per sheet. Returns only a status: never the link, which belongs in the inbox alone.
 */
export async function sendClaimEmail(
  slug: string,
  claimId: string,
  editToken: string,
): Promise<ActionResult<{ status: "sent" | "linked" | "none" }>> {
  if (!SLUG.test(slug) || !UUID.test(claimId) || !UUID.test(editToken)) return { ok: true, data: { status: "none" } };
  // A missing env var must never burn a guest's one send.
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return { ok: true, data: { status: "none" } };
  const r = await claimGuestLink(slug, claimId, editToken);
  if (r.status !== "send") return { ok: true, data: { status: r.status } };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const mail = guestLinkEmail({
    title: r.title,
    hostName: r.hostName,
    when: whenPhrase(r.startsAt, r.timeZone),
    url: guestLinkUrl(origin, slug, r.linkToken),
  });
  const ok = await sendEmail({ to: r.guestEmail, ...mail, idempotencyKey: `guest-link/${r.linkId}` });
  if (ok) await markGuestLinkSent(r.linkId);
  return { ok: true, data: { status: ok ? "sent" : "none" } };
}
