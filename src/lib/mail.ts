import "server-only";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Send through Resend. Never throws; returns whether Resend accepted it. Logs only the status. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": opts.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.text, html: opts.html }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`resend ${res.status}`);
    return res.ok;
  } catch {
    console.error("resend failed");
    return false;
  }
}

/** The one email a guest gets per sheet. No guest-entered text in it. */
export function guestLinkEmail(p: { title: string; hostName: string; when: string; url: string }) {
  const subject = `You're on the list for ${p.title}`.replace(/[\r\n]+/g, " ");
  const line = `You're on the list for ${p.hostName}'s ${p.title}, ${p.when}. Change what you're bringing here.`;
  const text = `${line}\n\n${p.url}\n`;
  const html = `<p>${esc(line)}</p><p><a href="${esc(p.url)}">${esc(p.url)}</a></p>`;
  return { subject, text, html };
}
