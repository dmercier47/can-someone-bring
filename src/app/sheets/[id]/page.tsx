import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getHostSheet } from "@/lib/sheets";
import { shortDateTime } from "@/lib/dates";
import { categoryColor, type CategoryColor } from "@/lib/types";
import { HostNav, ui } from "@/components/ui";
import Sticker from "@/components/Sticker";
import ShareTools from "./ShareTools";

const CARD_BG: Record<CategoryColor, string> = {
  yellow: "bg-cat-yellow",
  pink: "bg-cat-pink",
  blue: "bg-cat-blue",
  mint: "bg-cat-mint",
  tomato: "bg-cat-tomato",
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const sheet = await getHostSheet((await params).id);
  return { title: `${sheet?.title ?? "Party"} · Can Someone Bring` };
}

export default async function HostSheetPage({ params }: Props) {
  const { id } = await params;
  const sheet = await getHostSheet(id);
  if (!sheet) notFound();

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin}/s/${sheet.slug}`;

  const claimsBySlot = new Map<string, typeof sheet.claims>();
  for (const c of sheet.claims) claimsBySlot.set(c.slotId, [...(claimsBySlot.get(c.slotId) ?? []), c]);
  const slots = sheet.categories.flatMap((c) => c.slots);
  const needed = slots.reduce((n, s) => n + Math.max(0, s.quantity - (claimsBySlot.get(s.id)?.length ?? 0)), 0);
  const diets = sheet.claims.filter((c) => c.dietaryNote);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-16">
      <HostNav
        right={
          <Link href={`/sheets/${sheet.id}/edit`} className={ui.ghost}>
            Edit
          </Link>
        }
      />
      <Link href="/dashboard" className="mt-4 inline-block py-1 text-sm font-semibold text-muted">
        ← Your parties
      </Link>
      <h1 className="mt-1 text-[40px] leading-none font-extrabold tracking-[-0.035em]">{sheet.title}</h1>
      <p className="mt-2 text-[15px] text-muted">
        {shortDateTime(sheet.startsAt, sheet.timeZone)}
        {sheet.location && <> · {sheet.location}</>}
      </p>

      <div className="mt-6">
        <ShareTools url={url} title={sheet.title} />
      </div>

      <div className="mt-8 mb-5 flex items-end justify-between">
        <p className="flex items-baseline gap-2">
          <span className="text-[64px] leading-[0.8] font-extrabold tracking-[-0.05em] tabular-nums">{needed}</span>
          <span className="text-sm font-semibold text-muted">still needed</span>
        </p>
        <p className="text-sm font-semibold text-muted">{sheet.claims.length} claimed</p>
      </div>

      {diets.length > 0 && (
        <div className={`${ui.card} mb-5`}>
          <p className="text-sm font-bold">Dietary notes</p>
          <ul className="mt-1 text-[15px]">
            {diets.map((c) => (
              <li key={c.id}>
                <b>{c.guestName}:</b> {c.dietaryNote}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        {sheet.categories.map((cat, idx) => (
          <section
            key={cat.id}
            className={`relative rounded-[30px] px-4 pt-4 text-cat-ink ${CARD_BG[categoryColor(cat, idx)]} ${idx > 0 ? "-mt-7" : ""} ${
              idx === sheet.categories.length - 1 ? "pb-4" : "pb-11"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sticker name={cat.sticker} size={40} className="-my-1" />
              <h2 className="flex-1 text-[20px] font-extrabold tracking-[-0.02em]">{cat.name}</h2>
            </div>
            <ul className="mt-3 grid gap-1.5">
              {cat.slots.map((slot) => {
                const cl = claimsBySlot.get(slot.id) ?? [];
                const open = slot.quantity - cl.length;
                return (
                  <li key={slot.id} className="rounded-[18px] bg-cat-row px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <p className="flex-1 font-semibold">
                        {slot.name}
                        {slot.createdByGuest && <span className="ml-1.5 text-xs font-semibold opacity-60">added by guest</span>}
                      </p>
                      <span className={`text-sm font-semibold ${open > 0 ? "" : "opacity-60"}`}>
                        {open > 0 ? `${open} open` : "✓"}
                      </span>
                    </div>
                    {cl.length > 0 && (
                      <p className="text-[13px] opacity-70">
                        {cl.map((c) => `${c.guestName}${c.detail ? ` (${c.detail})` : ""}`).join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
