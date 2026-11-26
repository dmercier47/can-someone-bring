/** Cookie holding where a host was headed before signing in (e.g. "/new"). */
export const NEXT_COOKIE = "csb_next";

/** Only allow same-site paths, never an external URL. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
