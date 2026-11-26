function part(d: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(d);
}

/** "Saturday at 6pm" */
export function whenPhrase(iso: string, timeZone: string) {
  const d = new Date(iso);
  const day = part(d, timeZone, { weekday: "long" });
  const time = part(d, timeZone, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();
  return `${day} at ${time}`;
}

/** "Sat, Nov 28" */
export function shortDate(iso: string, timeZone: string) {
  return part(new Date(iso), timeZone, { weekday: "short", month: "short", day: "numeric" });
}

/** "Sat, Nov 28 · 6pm" */
export function shortDateTime(iso: string, timeZone: string) {
  const time = part(new Date(iso), timeZone, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase();
  return `${shortDate(iso, timeZone)} · ${time}`;
}

/** Value for <input type="datetime-local"> in the party's time zone: "2026-11-28T18:00" */
export function toLocalInput(iso: string, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Convert a wall-clock time ("2026-11-28T18:00") in a given IANA time zone to an ISO timestamp.
 * Works server-side regardless of the server's own time zone.
 */
export function fromLocalInput(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Find the zone's offset at that moment, then correct (twice, to settle DST edges).
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const shown = toLocalInput(new Date(guess).toISOString(), timeZone);
    const [sy, smo, sd, sh, smi] = shown.split(/[-T:]/).map(Number);
    guess += asUtc - Date.UTC(sy, smo - 1, sd, sh, smi);
  }
  return new Date(guess).toISOString();
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
