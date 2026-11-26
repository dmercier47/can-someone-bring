import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { ui, Wordmark } from "@/components/ui";
import Sticker from "@/components/Sticker";

export default async function Home() {
  const user = await currentUser();

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
          You&apos;re hosting. Can someone bring <span className="marker" style={{ "--hl": "var(--cat-pink)" } as React.CSSProperties}>a pie</span>
          <Sticker name="pie" size={38} className="-mt-2 ml-1 align-middle" />,{" "}
          <span className="marker" style={{ "--hl": "var(--cat-blue)" } as React.CSSProperties}>the ice</span>
          <Sticker name="ice" size={38} className="-mt-2 ml-1 align-middle" /> and{" "}
          <span className="marker" style={{ "--hl": "var(--cat-yellow)" } as React.CSSProperties}>some chairs</span>
          <Sticker name="chair" size={38} className="-mt-2 ml-1 align-middle" />?
        </p>
        <p className="mt-5 text-lg text-muted">
          The signup sheet for dinner parties and house parties. Make a list, drop the link in your Partiful invite, and let
          friends claim what they&apos;re bringing. No app, no accounts for guests.
        </p>
        <div className="mt-8 grid gap-2 sm:flex">
          <Link href="/new" className={ui.pill}>
            Start a party sheet
          </Link>
          <Link href="/s/demo" className={`${ui.ghost} h-14 px-7 text-[16px]`}>
            See a demo
          </Link>
        </div>
      </div>
    </main>
  );
}
