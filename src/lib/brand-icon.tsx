import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The wordmark's accent "?" in Hedvig Letters Serif on the After dark page.
// ImageResponse can't read CSS variables, so these mirror --bg and --accent in src/app/globals.css.
const BG = "#121011";
const ACCENT = "#ff4d6d";

// One-glyph subset of Hedvig Letters Serif (just "?"), from Google Fonts.
const font = readFile(join(process.cwd(), "src/assets/hedvig-serif-qmark.ttf"));

export async function brandIcon(size: number, { rounded }: { rounded: boolean }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BG,
          borderRadius: rounded ? size * 0.22 : 0,
          color: ACCENT,
          fontFamily: "Hedvig Letters Serif",
          fontSize: size * 0.95,
          lineHeight: 1,
          paddingTop: size * 0.06,
        }}
      >
        ?
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Hedvig Letters Serif", data: await font, style: "normal", weight: 400 }],
    },
  );
}
