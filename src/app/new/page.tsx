import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { HostNav } from "@/components/ui";
import NewSheetForm from "./NewSheetForm";

export const metadata = { title: "New party · Can Someone Bring" };

export default async function NewSheetPage() {
  const user = await currentUser();
  const defaultName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pt-4 pb-16">
      <HostNav
        right={
          <Link href="/dashboard" className="h-11 px-2 text-sm leading-[44px] font-semibold text-muted">
            Cancel
          </Link>
        }
      />
      <h1 className="mt-6 mb-8 text-[40px] leading-none font-extrabold tracking-[-0.035em]">New party</h1>
      <NewSheetForm defaultName={defaultName} />
    </main>
  );
}
