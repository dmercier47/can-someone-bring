import type { CategoryColor } from "./types";

/**
 * Category tint background classes. Literal class names so Tailwind picks them up.
 * Lives in a plain module (not a "use client" file) so server components can use it too.
 */
export const CARD_BG: Record<CategoryColor, string> = {
  yellow: "bg-cat-yellow",
  pink: "bg-cat-pink",
  blue: "bg-cat-blue",
  mint: "bg-cat-mint",
  tomato: "bg-cat-tomato",
};
