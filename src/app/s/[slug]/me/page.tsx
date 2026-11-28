import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveEditTokens, resolveGuestLink } from "@/lib/sheets";
import { parseEditTokens, parseGuestToken } from "@/lib/edit-link";
import { ui } from "@/components/ui";
import RestoreClaims from "./RestoreClaims";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Can Someone Bring",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string | string[]; g?: string | string[] }> };

/** Resolves a private link (copied ?t= or emailed ?g=) to this guest's claims, then hands off to the sheet. */
export default async function MePage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  const { t, g } = await searchParams;
  const supplied = t !== undefined || g !== undefined;
  const [fromTokens, fromGuest] = await Promise.all([
    resolveEditTokens(slug, parseEditTokens(t)),
    resolveGuestLink(slug, parseGuestToken(g)),
  ]);
  const mine = { ...fromTokens, ...fromGuest };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4">
      <nav className="flex h-11 items-center">
        <span className="font-display text-[18px] tracking-[-0.01em]">
          can someone bring<span className="text-accent">?</span>
        </span>
      </nav>
      <RestoreClaims slug={slug} mine={mine} supplied={supplied} />
      <noscript>
        <a href={`/s/${slug}`} className={`${ui.pillOutline} mt-6`}>
          Open the party
        </a>
      </noscript>
    </main>
  );
}
