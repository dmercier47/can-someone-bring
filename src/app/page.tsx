import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
      <p className="text-4xl" aria-hidden>🥧🥂🧊</p>
      <h1 className="mt-4 font-display text-4xl leading-tight font-bold tracking-tight">Can Someone Bring…?</h1>
      <p className="mt-3 text-lg text-muted">
        The signup sheet for dinner parties and house parties. Make a list, drop the link in your Partiful invite, and
        let friends claim what they&apos;re bringing.
      </p>
      <Link
        href="/s/demo"
        className="mt-8 inline-flex w-full items-center justify-center h-14 rounded-full bg-pill text-[16px] font-bold text-pill-ink sm:w-fit sm:px-8"
      >
        See a demo sheet
      </Link>
    </main>
  );
}
