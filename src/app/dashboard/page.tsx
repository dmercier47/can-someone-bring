import Link from "next/link";
import { listHostSheets } from "@/lib/sheets";
import { shortDateTime } from "@/lib/dates";
import { CATEGORY_COLORS } from "@/lib/types";
import { HostNav, ui } from "@/components/ui";
import Sticker from "@/components/Sticker";

export const metadata = { title: "Your parties · Can Someone Bring" };

const CARD_BG = { yellow: "bg-cat-yellow", pink: "bg-cat-pink", blue: "bg-cat-blue", mint: "bg-cat-mint", tomato: "bg-cat-tomato" };

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
            <button className="h-11 px-2 text-sm font-semibold text-muted">Sign out</button>
          </form>
        }
      />

      <h1 className="mt-6 text-[40px] leading-none font-extrabold tracking-[-0.035em]">Your parties</h1>

      {sheets.length === 0 ? (
        <div className="mt-10 rounded-[30px] bg-surface p-6 text-center">
          <Sticker name="party" size={72} className="mx-auto" />
          <p className="mt-3 text-xl font-extrabold tracking-tight">No parties yet</p>
          <p className="mt-1 text-muted">Make a sheet, paste the link in your Partiful invite, done.</p>
          <Link href="/new" className={`${ui.pill} mt-6 w-full`}>
            Start a party sheet
          </Link>
        </div>
      ) : (
        <>
          <Stack sheets={upcoming} />
          {past.length > 0 && (
            <>
              <h2 className="mt-10 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Past</h2>
              <ul className="grid gap-2">
                {past.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sheets/${s.id}`} className="flex items-center gap-3 rounded-3xl bg-surface p-3 pr-5">
                      <Sticker name={s.sticker} size={36} />
                      <span className="flex-1 font-semibold">{s.title}</span>
                      <span className="text-sm text-muted">{shortDateTime(s.startsAt, s.timeZone).split(" · ")[0]}</span>
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
          className="bottom-safe fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-pill py-2 pr-2 pl-6 text-[15px] font-semibold text-pill-ink shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          New party
          <span className="grid size-10 place-items-center rounded-full bg-accent text-2xl text-white">+</span>
        </Link>
      )}
    </main>
  );
}

function Stack({ sheets }: { sheets: Awaited<ReturnType<typeof listHostSheets>> }) {
  if (!sheets.length) return <p className="mt-6 text-muted">Nothing coming up.</p>;
  return (
    <div className="mt-6">
      {sheets.map((s, i) => (
        <Link
          key={s.id}
          href={`/sheets/${s.id}`}
          className={`relative block rounded-[30px] px-5 pt-5 text-cat-ink ${CARD_BG[CATEGORY_COLORS[i % CATEGORY_COLORS.length]]} ${
            i > 0 ? "-mt-7" : ""
          } ${i === sheets.length - 1 ? "pb-5" : "pb-12"}`}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold opacity-70">{shortDateTime(s.startsAt, s.timeZone)}</p>
              <p className="mt-0.5 truncate text-[26px] leading-tight font-extrabold tracking-[-0.03em]">{s.title}</p>
              <p className="mt-2 text-sm font-semibold">
                {s.needed > 0 ? `${s.needed} still needed` : "Everything's covered ✓"}
                <span className="opacity-60"> · {s.claimed} claimed</span>
              </p>
            </div>
            <Sticker name={s.sticker} size={56} className="-mt-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
