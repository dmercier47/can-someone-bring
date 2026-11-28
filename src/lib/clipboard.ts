/** Copy text to the clipboard, with a fallback for older browsers, in-app browsers and non-secure dev origins. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // fall through to the textarea fallback
  }
  const t = document.createElement("textarea");
  t.value = text;
  t.readOnly = true;
  t.style.position = "fixed";
  t.style.opacity = "0";
  t.style.fontSize = "16px";
  document.body.appendChild(t);
  t.select();
  t.setSelectionRange(0, text.length);
  try {
    document.execCommand("copy");
  } catch {}
  t.remove();
}
