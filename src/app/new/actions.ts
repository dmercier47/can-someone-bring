"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getTemplate } from "@/lib/templates";
import { randomSlug } from "@/lib/slug";
import { fromLocalInput, isValidTimeZone } from "@/lib/dates";

export type NewSheetState = { error?: string };

function text(form: FormData, key: string, max: number) {
  const v = String(form.get(key) ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : undefined;
}

export async function createSheet(_: NewSheetState, form: FormData): Promise<NewSheetState> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/new");

  const template = getTemplate(String(form.get("template") ?? ""));
  const title = text(form, "title", 80);
  const hostName = text(form, "hostName", 60);
  const tzRaw = String(form.get("timeZone") ?? "");
  const timeZone = isValidTimeZone(tzRaw) ? tzRaw : "America/New_York";
  const startsAt = fromLocalInput(String(form.get("startsAt") ?? ""), timeZone);
  const location = text(form, "location", 120);
  const hostNote = text(form, "hostNote", 500);
  const partifulUrl = text(form, "partifulUrl", 300);

  if (!template) return { error: "Pick a template to start from." };
  if (!title) return { error: "Give your party a name." };
  if (!hostName) return { error: "Add your name so guests know who's hosting." };
  if (!startsAt) return { error: "When's the party?" };
  if (partifulUrl && !/^https:\/\/\S+$/.test(partifulUrl)) return { error: "The invite link should start with https://" };

  // Insert the sheet, retrying in the unlikely case the random share code is taken.
  let sheetId: string | undefined;
  for (let attempt = 0; attempt < 3 && !sheetId; attempt++) {
    const { data, error } = await supabase
      .from("sheets")
      .insert({
        host_id: user.id,
        slug: randomSlug(),
        title,
        host_name: hostName,
        starts_at: startsAt,
        time_zone: timeZone,
        location: location ?? null,
        host_note: hostNote ?? null,
        partiful_url: partifulUrl ?? null,
      })
      .select("id")
      .single();
    if (data) sheetId = data.id;
    else if (error?.code !== "23505") return { error: "Couldn't create the sheet. Try again?" };
  }
  if (!sheetId) return { error: "Couldn't create the sheet. Try again?" };

  const categories = template.categories.map((c, i) => ({
    id: crypto.randomUUID(),
    sheet_id: sheetId,
    name: c.name,
    sticker: c.sticker,
    position: i + 1,
  }));
  const slots = template.categories.flatMap((c, i) =>
    c.slots.map((s, j) => ({
      category_id: categories[i].id,
      name: s.name,
      quantity: s.quantity ?? 1,
      note: s.note ?? null,
      sticker: s.sticker ?? null,
      position: j + 1,
    })),
  );

  const cat = await supabase.from("categories").insert(categories);
  const sl = cat.error ? cat : await supabase.from("slots").insert(slots);
  if (cat.error || sl.error) {
    await supabase.from("sheets").delete().eq("id", sheetId);
    return { error: "Couldn't create the sheet. Try again?" };
  }

  // Remember the host's name for next time.
  if (user.user_metadata?.name !== hostName) await supabase.auth.updateUser({ data: { name: hostName } });

  redirect(`/sheets/${sheetId}?new=1`);
}
