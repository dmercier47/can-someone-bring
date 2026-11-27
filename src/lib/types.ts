import type { StickerKey } from "./stickers";

/** Default category palette. Hosts can optionally override a category's color. */
export const CATEGORY_COLORS = ["yellow", "pink", "blue", "mint", "tomato"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export type Slot = {
  id: string;
  name: string;
  /** How many people can claim this slot, e.g. "Sides ×4" */
  quantity: number;
  note?: string;
  /** Shown inline in the header sentence; falls back to the category sticker */
  sticker?: StickerKey;
  createdByGuest?: boolean;
};

export type Category = {
  id: string;
  name: string;
  sticker: StickerKey;
  /** Optional host override; defaults to CATEGORY_COLORS by position */
  color?: CategoryColor;
  slots: Slot[];
};

export type Claim = {
  id: string;
  slotId: string;
  guestName: string;
  /** How many spots on the item this claim covers (one person can bring 2 bottles) */
  quantity: number;
  /** What exactly they're bringing, e.g. "mac & cheese" */
  detail?: string;
  dietaryNote?: string;
};

export type Sheet = {
  id: string;
  slug: string;
  /** The party's name, used in a sentence: "Sam's hosting <title> Saturday at 6" */
  title: string;
  hostName: string;
  /** ISO timestamp */
  startsAt: string;
  timeZone: string;
  location?: string;
  hostNote?: string;
  partifulUrl?: string;
  allowGuestItems: boolean;
  categories: Category[];
  claims: Claim[];
};

export function categoryColor(category: { color?: CategoryColor }, index: number): CategoryColor {
  return category.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** Spots taken on a slot: claims can cover more than one each. */
export function takenCount(claims: { quantity: number }[]): number {
  return claims.reduce((n, c) => n + c.quantity, 0);
}
