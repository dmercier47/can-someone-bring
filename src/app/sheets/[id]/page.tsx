import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getHostSheet } from "@/lib/sheets";
import { shortDateTime, toLocalInput } from "@/lib/dates";
import { HostNav, ui } from "@/components/ui";
import ShareTools from "./ShareTools";
import { ArrowLeftIcon } from "@/components/icons";
import HostBoard from "./HostBoard";
import PartyMenu from "./PartyMenu";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props) {
  const sheet = await getHostSheet((await params).id);
  return { title: `${sheet?.title ?? "Party"} · Can Someone Bring` };
}

export default async function HostSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  const sheet = await getHostSheet(id);
  if (!sheet) notFound();

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin}/s/${sheet.slug}`;

  const slots = sheet.categories.flatMap((c) => c.slots);
  const claimed = new Map<string, number>();
  for (const c of sheet.claims) claimed.set(c.slotId, (claimed.get(c.slotId) ?? 0) + 1);
  const needed = slots.reduce((n, s) => n + Math.max(0, s.quantity - (claimed.get(s.id) ?? 0)), 0);
  const diets = sheet.claims.filter((c) => c.dietaryNote);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-16">
      <HostNav
        right={
          <PartyMenu
            sheetId={sheet.id}
            guestUrl={`/s/${sheet.slug}`}
            details={{
              title: sheet.title,
              hostName: sheet.hostName,
              startsAt: toLocalInput(sheet.startsAt, sheet.timeZone),
              timeZone: sheet.timeZone,
              location: sheet.location ?? "",
              hostNote: sheet.hostNote ?? "",
              partifulUrl: sheet.partifulUrl ?? "",
              allowGuestItems: sheet.allowGuestItems,
            }}
          />
        }
      />
      <Link href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 py-1 text-[14px] text-muted">
        <ArrowLeftIcon size={16} />
        Your parties
      </Link>
      <h1 className={`mt-1 ${ui.h1}`}>{sheet.title}</h1>
      <p className="mt-2 text-[14px] text-muted">
        {shortDateTime(sheet.startsAt, sheet.timeZone)}
        {sheet.location && <> · {sheet.location}</>}
      </p>

      {isNew && (
        <p className="mt-6 border-l-2 border-accent pl-4 text-[15px] leading-relaxed">
          <span className="font-display text-[18px]">Your list is ready.</span>
          <br />
          <span className="text-ink/75">Tap the pencil on any category to change it, then copy the link into your Partiful invite.</span>
        </p>
      )}

      <div className="mt-6">
        <ShareTools url={url} title={sheet.title} />
      </div>

      <div className="mt-8 mb-5 flex items-end justify-between">
        <p className="flex items-baseline gap-2">
          <span className="text-[60px] leading-[0.75] tracking-[-0.04em] tabular-nums">{needed}</span>
          <span className="text-[14px] text-muted">still needed</span>
        </p>
        <p className="text-[13px] text-muted">{sheet.claims.length} claimed</p>
      </div>

      {diets.length > 0 && (
        <div className="mb-7 border-l-2 border-ink pl-4">
          <p className={`${ui.eyebrow} text-muted`}>Dietary notes</p>
          <ul className="mt-1.5 space-y-0.5 text-[15px]">
            {diets.map((c) => (
              <li key={c.id}>
                <span className="text-muted">{c.guestName} · </span>
                {c.dietaryNote}
              </li>
            ))}
          </ul>
        </div>
      )}

      <HostBoard sheetId={sheet.id} categories={sheet.categories} claims={sheet.claims} />
    </main>
  );
}
