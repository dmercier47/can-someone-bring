"""
QA helper: open a page as an iPhone in WebKit (the engine behind iOS Safari) and report
the things that broke on real iPhones before.

    python3 scripts/qa-webkit.py http://localhost:3000/s/demo [--shot /path/out.png]

Reports console errors, horizontal scroll, inputs under 16px, tap targets under 44px, and
any confirm()/alert()/prompt() the page tries to show. Playwright auto-dismisses those
dialogs, so a button using one looks fine in automation but can do nothing on an iPhone.

It can't show the iOS keyboard, the AutoFill bar or native date pickers: those still need
the iOS Simulator or a real phone. Needs `python3 -m playwright install webkit` once.
For flows (tapping, typing), import `iphone_page` from this file in your own script.
"""

import json
import sys
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

# Watches every dialog the page opens, so callers can report dead confirm()/alert() buttons.
DIALOGS: list[str] = []


@contextmanager
def iphone_page():
    with sync_playwright() as p:
        browser = p.webkit.launch()
        context = browser.new_context(**p.devices["iPhone 13"])
        page = context.new_page()
        errors: list[str] = []
        # WebKit logs our Chromium-only viewport hint as an error; it's harmless.
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "interactive-widget" not in m.text else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        def on_dialog(d):
            DIALOGS.append(f"{d.type}: {d.message}")
            d.dismiss()

        page.on("dialog", on_dialog)
        try:
            yield page, errors
        finally:
            browser.close()


AUDIT_JS = """
() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.name || el.tagName).trim().slice(0, 40);
  const small = [...document.querySelectorAll('button, a[href], [role=button], input, select, textarea')]
    .filter(vis)
    .filter((el) => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 44 && !['checkbox', 'radio'].includes(el.type); })
    .map((el) => `${label(el)} (${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`);
  const tinyInputs = [...document.querySelectorAll('input, select, textarea')]
    .filter(vis)
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
    .map(label);
  return { scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth, smallTapTargets: small, inputsUnder16px: tinyInputs };
}
"""


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    url = sys.argv[1]
    shot = sys.argv[sys.argv.index("--shot") + 1] if "--shot" in sys.argv else None
    with iphone_page() as (page, errors):
        page.goto(url, wait_until="networkidle")
        audit = page.evaluate(AUDIT_JS)
        if shot:
            page.screenshot(path=shot, full_page=True)
        report = {
            "url": page.url,
            "horizontalScroll": audit["scrollWidth"] > audit["viewport"],
            "smallTapTargets": audit["smallTapTargets"],
            "inputsUnder16px": audit["inputsUnder16px"],
            "dialogs": DIALOGS,
            "consoleErrors": errors,
            "screenshot": shot,
        }
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
