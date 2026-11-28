"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addTokens, setFlash } from "@/lib/guest-storage";

/** Saves the claims this link unlocked on this device, leaves a note for the toast, and opens the sheet. */
export default function RestoreClaims({ slug, mine, supplied }: { slug: string; mine: Record<string, string>; supplied: boolean }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (Object.keys(mine).length) addTokens(slug, mine);
    if (supplied) setFlash(slug, Object.keys(mine));
    router.replace(`/s/${slug}`);
  }, [slug, mine, supplied, router]);

  return (
    <p role="status" className="mt-8 text-muted">
      One sec.
    </p>
  );
}
