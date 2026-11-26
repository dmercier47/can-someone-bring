import { Wordmark } from "@/components/ui";
import ConfirmSignIn from "./ConfirmSignIn";

export const metadata = { title: "Signing in · Can Someone Bring", robots: { index: false } };

type Props = { searchParams: Promise<{ token_hash?: string; type?: string; code?: string; next?: string }> };

// Where sign-in links land. Deliberately does nothing on load except render — the one-time
// link is only used when the page's form submits (see ConfirmSignIn / actions.ts).
export default async function ConfirmPage({ searchParams }: Props) {
  const { token_hash, type, code, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-10">
      <nav className="flex h-11 items-center">
        <Wordmark />
      </nav>
      <div className="flex flex-1 flex-col justify-center py-10">
        <ConfirmSignIn params={{ token_hash, type, code, next }} />
      </div>
    </main>
  );
}
