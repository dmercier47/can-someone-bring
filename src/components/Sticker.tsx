import { stickerUrl, type StickerKey } from "@/lib/stickers";

/** A Fluent 3D emoji sticker. Decorative: always paired with visible text. */
export default function Sticker({
  name,
  size = 40,
  className = "",
  eager = true,
}: {
  name: StickerKey;
  size?: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    // Plain <img>: these are small static PNGs from a CDN; next/image optimization isn't worth the cost here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={stickerUrl(name)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={`inline-block select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
