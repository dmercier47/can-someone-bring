import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { ui, Wordmark } from "@/components/ui";
import Sticker from "@/components/Sticker";
import type { StickerKey } from "@/lib/stickers";
import type { CategoryColor } from "@/lib/types";

type Ask = { text: string; sticker: StickerKey; color: CategoryColor };

/** Hero examples, one set picked per visit. Only things a host would really ask for. */
const HEROES: [Ask, Ask, Ask][] = [
  [
    { text: "dirty martini olives", sticker: "olive", color: "mint" },
    { text: "a bouquet", sticker: "bouquet", color: "pink" },
    { text: "more ice", sticker: "ice", color: "blue" },
  ],
  [
    { text: "something sparkling", sticker: "champagne", color: "yellow" },
    { text: "the good cheese", sticker: "cheese", color: "tomato" },
    { text: "candles", sticker: "candle", color: "pink" },
  ],
  [
    { text: "natural wine", sticker: "wine", color: "pink" },
    { text: "a disco ball", sticker: "discoBall", color: "blue" },
    { text: "a baguette", sticker: "baguette", color: "yellow" },
  ],
  [
    { text: "tinned fish", sticker: "tin", color: "blue" },
    { text: "flowers for the table", sticker: "bouquet", color: "mint" },
    { text: "a cake", sticker: "cake", color: "yellow" },
  ],
];

function Highlight({ ask }: { ask: Ask }) {
  return (
    <>
      <span className="marker" style={{ "--hl": `var(--cat-${ask.color})` } as React.CSSProperties}>
        {ask.text}
      </span>
      <Sticker name={ask.sticker} size={38} className="-mt-2 ml-1 align-middle" />
    </>
  );
}

export default async function Home() {
  const user = await currentUser();
  const [a, b, c] = HEROES[Math.floor(Math.random() * HEROES.length)];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-4 pb-12">
      <nav className="flex h-11 items-center justify-between">
        <Wordmark />
        <Link href={user ? "/dashboard" : "/login"} className="h-11 px-2 text-[14px] leading-[44px] text-muted">
          {user ? "Your parties" : "Sign in"}
        </Link>
      </nav>

      <div className="flex flex-1 flex-col justify-center py-12">
        <p className="font-display text-[36px] leading-[1.16] tracking-[-0.015em] text-faint">
          You&apos;re hosting. Can someone bring <Highlight ask={a} />, <Highlight ask={b} /> and <Highlight ask={c} />?
        </p>
        <p className="mt-5 text-lg text-muted">
          For dinners, birthdays, pregames and the afters. Make a list, drop the link in your Partiful, and let your people
          claim what they&apos;re bringing. No app, no accounts for guests.
        </p>
        <div className="mt-8 grid gap-2 sm:flex">
          <Link href="/new" className={ui.pill}>
            Plan a party
          </Link>
          <Link href="/s/demo" className={ui.pillOutline}>
            See a demo
          </Link>
        </div>
      </div>
    </main>
  );
}
