import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { Wordmark } from "@/components/ui";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · Can Someone Bring" };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  if (await currentUser()) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-4 pb-10">
      <nav className="flex h-11 items-center">
        <Wordmark />
      </nav>
      <div className="flex flex-1 flex-col justify-center py-10">
        <LoginForm next={next} linkError={error === "link"} />
      </div>
    </main>
  );
}
