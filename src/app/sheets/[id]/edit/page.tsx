import Link from "next/link";
import { notFound } from "next/navigation";
import { getHostSheet } from "@/lib/sheets";
import { toLocalInput } from "@/lib/dates";
import { HostNav } from "@/components/ui";
import SheetEditor from "./SheetEditor";
import type { Draft } from "./actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

export const metadata = { title: "Edit party · Can Someone Bring" };

export default async function EditSheetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const isNew = (await searchParams).new === "1";
  const sheet = await getHostSheet(id);
  if (!sheet) notFound();

  const initial: Draft = {
    title: sheet.title,
    hostName: sheet.hostName,
    startsAt: toLocalInput(sheet.startsAt, sheet.timeZone),
    timeZone: sheet.timeZone,
    location: sheet.location ?? "",
    hostNote: sheet.hostNote ?? "",
    partifulUrl: sheet.partifulUrl ?? "",
    allowGuestItems: sheet.allowGuestItems,
    categories: sheet.categories.map((c) => ({
      id: c.id,
      name: c.name,
      sticker: c.sticker,
      color: c.color,
      slots: c.slots.map((s) => ({ id: s.id, name: s.name, quantity: s.quantity, note: s.note })),
    })),
  };
  const claimCounts: Record<string, number> = {};
  for (const c of sheet.claims) claimCounts[c.slotId] = (claimCounts[c.slotId] ?? 0) + 1;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-40">
      <HostNav
        right={
          !isNew && (
            <Link href={`/sheets/${sheet.id}`} className="h-11 px-2 text-sm leading-[44px] font-semibold text-muted">
              Cancel
            </Link>
          )
        }
      />
      <h1 className="mt-6 text-[40px] leading-none font-extrabold tracking-[-0.035em]">{isNew ? "Make the list" : `Edit ${sheet.title}`}</h1>
      <SheetEditor sheetId={sheet.id} initial={initial} claimCounts={claimCounts} isNew={isNew} />
    </main>
  );
}
