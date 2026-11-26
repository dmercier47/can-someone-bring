import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSheetBySlug } from "@/lib/sheets";
import SignupBoard from "@/components/SignupBoard";

type Props = { params: Promise<{ slug: string }> };

function part(d: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(d);
}

/** "Saturday at 6pm" — formatted on the server so it matches the party's time zone. */
function whenPhrase(iso: string, timeZone: string) {
  const d = new Date(iso);
  const day = part(d, timeZone, { weekday: "long" });
  const time = part(d, timeZone, { hour: "numeric", minute: "2-digit" })
    .replace(":00", "")
    .replace(" ", "")
    .toLowerCase();
  return `${day} at ${time}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sheet = await getSheetBySlug(slug);
  if (!sheet) return { title: "Can Someone Bring" };
  const when = whenPhrase(sheet.startsAt, sheet.timeZone);
  return {
    title: `${sheet.title} · Can Someone Bring`,
    description: `${sheet.hostName}'s hosting ${sheet.title} ${when}. Claim something to bring!`,
    openGraph: {
      title: `Can someone bring something to ${sheet.title}?`,
      description: `${when} · Tap to claim a dish.`,
    },
  };
}

export default async function GuestSheetPage({ params }: Props) {
  const { slug } = await params;
  const sheet = await getSheetBySlug(slug);
  if (!sheet) notFound();

  const d = new Date(sheet.startsAt);
  const dateLabel = part(d, sheet.timeZone, { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-36">
      <nav className="flex items-center justify-between">
        <span className="text-[15px] font-extrabold tracking-tight">
          can someone bring<span className="text-accent">?</span>
        </span>
        {sheet.partifulUrl && (
          <a
            href={sheet.partifulUrl}
            className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold"
          >
            Invite <span aria-hidden>↗</span>
          </a>
        )}
      </nav>

      <SignupBoard
        sheet={sheet}
        when={whenPhrase(sheet.startsAt, sheet.timeZone)}
        dateLabel={dateLabel}
      />

      <footer className="mt-14 text-center text-xs text-faint">
        Made with <span className="font-bold">can someone bring?</span>
      </footer>
    </main>
  );
}
