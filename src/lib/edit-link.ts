// Pure helpers for the two link forms under /s/<slug>/me. Never throw.

const HEX32 = /^[0-9a-f]{32}$/;
const MAX_TOKENS = 20;

function dash(hex: string) {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function strip(token: string) {
  return token.replace(/-/g, "").toLowerCase();
}

/** Copied link: one claim edit token per part, dashes removed, joined by ".". */
export function editLinkUrl(origin: string, slug: string, tokens: (string | undefined)[]): string {
  const t = tokens
    .filter((x): x is string => typeof x === "string")
    .map(strip)
    .filter((x) => HEX32.test(x))
    .slice(0, MAX_TOKENS)
    .join(".");
  return `${origin}/s/${slug}/me?t=${t}`;
}

/** Emailed link: the guest_links token. */
export function guestLinkUrl(origin: string, slug: string, token: string): string {
  return `${origin}/s/${slug}/me?g=${strip(token)}`;
}

function first(raw: unknown): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" ? v.slice(0, 1000) : "";
}

export function parseEditTokens(raw: unknown): string[] {
  try {
    const out: string[] = [];
    for (const part of first(raw).split(".")) {
      const hex = strip(part);
      if (!HEX32.test(hex)) continue;
      const id = dash(hex);
      if (!out.includes(id)) out.push(id);
      if (out.length >= MAX_TOKENS) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function parseGuestToken(raw: unknown): string | null {
  try {
    const hex = strip(first(raw));
    return HEX32.test(hex) ? dash(hex) : null;
  } catch {
    return null;
  }
}
