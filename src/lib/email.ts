// Pure email helpers, shared by the browser form and the server action.

const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Trim, lowercase the domain only, check the shape. Returns null if blank or invalid. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t || t.length > 254 || !SHAPE.test(t)) return null;
  const at = t.lastIndexOf("@");
  return `${t.slice(0, at)}@${t.slice(at + 1).toLowerCase()}`;
}

const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
  "outlok.com": "outlook.com",
};

/** A likely fix for a common domain typo, or null. */
export function suggestEmail(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return null;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const fixed = DOMAIN_TYPOS[domain] ?? (/\.(con|cmo)$/.test(domain) ? domain.replace(/\.(con|cmo)$/, ".com") : null);
  return fixed ? `${local}@${fixed}` : null;
}
