import Link from "next/link";
import { listHostSheets } from "@/lib/sheets";
import { shortDateTime } from "@/lib/dates";
import { CATEGORY_COLORS } from "@/lib/types";
import { HostNav, ui } from "@/components/ui";
import { CARD_BG } from "@/lib/colors";
import { PlusIcon } from "@/components/icons";
import Sticker from "@/components/Sticker";

export const metadata = { title: "Your parties · Can Someone Bring" };

export default async function Dashboard() {
  const sheets = await listHostSheets();
  const now = Date.now();
  const upcoming = sheets.filter((s) => new Date(s.startsAt).getTime() > now - 12 * 3600_000);
  const past = sheets.filter((s) => !upcoming.includes(s)).reverse();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-36">
      <HostNav
        right={
          <form action="/auth/signout" method="post">
            <button className="h-11 px-2 text-[14px] text-muted">Sign out</button>
          </form>
        }
      />

      <h1 className={`mt-7 ${ui.h1}`}>Your parties</h1>

      {sheets.length === 0 ? (
        <div className="mt-8 border-l-2 border-accent pl-5">
          <Sticker name="party" size={56} />
          <p className="mt-3 font-display text-[24px]">Nothing planned yet.</p>
          <p className="mt-1 text-[15px] text-muted">Make a list, paste the link into your Partiful invite, and let friends claim what they&apos;re bringing.</p>
          <Link href="/new" className={`${ui.pill} mt-6`}>
            <PlusIcon size={18} />
            Plan a party
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length ? (
            <ul className="mt-7 grid gap-3">
              {upcoming.map((s, i) => (
                <li key={s.id}>
                  <Link
                    href={`/sheets/${s.id}`}
                    className={`flex items-center gap-4 rounded-[20px] px-5 py-4 text-cat-ink ${CARD_BG[CATEGORY_COLORS[i % CATEGORY_COLORS.length]]}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-cat-muted">{shortDateTime(s.startsAt, s.timeZone)}</p>
                      <p className="mt-0.5 truncate font-display text-[26px] leading-tight tracking-[-0.015em]">{s.title}</p>
                      <p className="mt-1.5 text-[14px]">
                        {s.needed > 0 ? `${s.needed} still needed` : "Everything's covered"}
                        <span className="text-cat-muted"> · {s.claimed} claimed</span>
                      </p>
                    </div>
                    <Sticker name={s.sticker} size={52} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-muted">Nothing coming up.</p>
          )}

          {past.length > 0 && (
            <>
              <h2 className={`mt-10 mb-2 ${ui.eyebrow} text-muted`}>Past</h2>
              <ul className="border-t border-hair">
                {past.map((s) => (
                  <li key={s.id} className="border-b border-hair">
                    <Link href={`/sheets/${s.id}`} className="flex min-h-14 items-center gap-3 py-2">
                      <Sticker name={s.sticker} size={30} />
                      <span className="flex-1 truncate">{s.title}</span>
                      <span className="text-[13px] text-muted">{shortDateTime(s.startsAt, s.timeZone).split(" · ")[0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {sheets.length > 0 && (
        <Link
          href="/new"
          className="bottom-safe fixed left-1/2 z-20 flex min-h-14 w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-pill py-2 pr-2 pl-5 text-[15px] text-pill-ink shadow-[0_8px_24px_rgba(26,23,20,0.22)]"
        >
          Plan a new party
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-white">
            <PlusIcon size={20} strokeWidth={2.2} />
          </span>
        </Link>
      )}
    </main>
  );
}
