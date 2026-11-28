// Browser-only helpers for what a guest keeps on this device. Every storage call is wrapped.

export const NAME_KEY = "csb:name";
export const EMAIL_KEY = "csb:email";

/** claimId → secret edit token, per sheet, kept on this device. */
export const mineKey = (slug: string) => `csb:mine:${slug}`;
export type MyTokens = Record<string, string>;

export function loadTokens(slug: string): MyTokens {
  try {
    return JSON.parse(localStorage.getItem(mineKey(slug)) ?? "{}") as MyTokens;
  } catch {
    return {};
  }
}

function saveTokens(slug: string, tokens: MyTokens) {
  try {
    localStorage.setItem(mineKey(slug), JSON.stringify(tokens));
  } catch {}
}

/** Merge into whatever is stored now, so concurrent changes never overwrite each other. Returns the result. */
export function addTokens(slug: string, add: MyTokens): MyTokens {
  const next = { ...loadTokens(slug), ...add };
  saveTokens(slug, next);
  return next;
}

export function removeToken(slug: string, id: string): MyTokens {
  const { [id]: _removed, ...rest } = loadTokens(slug);
  void _removed;
  saveTokens(slug, rest);
  return rest;
}

export function loadEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveEmail(email: string) {
  try {
    if (email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {}
}

const flashKey = (slug: string) => `csb:flash:${slug}`;

export function setFlash(slug: string, ids: string[]) {
  try {
    sessionStorage.setItem(flashKey(slug), JSON.stringify(ids));
  } catch {}
}

/** Read and clear the one-shot flash. Returns null if there was none, else the restored claim ids. */
export function takeFlash(slug: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(flashKey(slug));
    if (raw === null) return null;
    sessionStorage.removeItem(flashKey(slug));
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return null;
  }
}
