import { redirect } from "next/navigation";

// Editing now happens inline on the party page; keep old links working.
export default async function EditRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/sheets/${(await params).id}`);
}
