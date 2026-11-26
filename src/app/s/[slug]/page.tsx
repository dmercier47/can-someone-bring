import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSheetBySlug } from "@/lib/sheets";
import SignupBoard from "@/components/SignupBoard";
import { shortDate, whenPhrase } from "@/lib/dates";
import { ui } from "@/components/ui";
import { ArrowUpRightIcon } from "@/components/icons";

type Props = { params: Promise<{ slug: string }> };

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

  const dateLabel = shortDate(sheet.startsAt, sheet.timeZone);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-36">
      <nav className="flex h-11 items-center justify-between">
        <span className="font-display text-[18px] tracking-[-0.01em]">
          can someone bring<span className="text-accent">?</span>
        </span>
        {sheet.partifulUrl && (
          <a href={sheet.partifulUrl} className={ui.ghost}>
            Invite
            <ArrowUpRightIcon size={16} />
          </a>
        )}
      </nav>

      <SignupBoard
        sheet={sheet}
        when={whenPhrase(sheet.startsAt, sheet.timeZone)}
        dateLabel={dateLabel}
      />

      <footer className="mt-14 text-center text-[12px] text-faint">
        Made with <span className="font-display text-muted">can someone bring?</span>
      </footer>
    </main>
  );
}
