import type { StickerKey } from "./stickers";

export type TemplateSlot = { name: string; quantity?: number; note?: string; sticker?: StickerKey };
export type TemplateCategory = { name: string; sticker: StickerKey; slots: TemplateSlot[] };
export type Template = {
  key: string;
  name: string;
  blurb: string;
  sticker: StickerKey;
  /** Suggested party name, prefilled in the form */
  title: string;
  categories: TemplateCategory[];
};

export const TEMPLATES: Template[] = [
  {
    key: "blank",
    name: "Start from scratch",
    blurb: "Add your own categories",
    sticker: "party",
    title: "",
    categories: [{ name: "Things to bring", sticker: "plate", slots: [{ name: "Something to share", quantity: 3, sticker: "plate" }] }],
  },
  {
    key: "dinner",
    name: "Dinner party",
    blurb: "A sit-down meal with friends",
    sticker: "plate",
    title: "Dinner party",
    categories: [
      { name: "Starters", sticker: "cheese", slots: [{ name: "Cheese or charcuterie", sticker: "cheese" }, { name: "A dip and crackers", sticker: "pretzel" }] },
      { name: "Sides", sticker: "salad", slots: [{ name: "A salad", sticker: "salad" }, { name: "A veggie side", sticker: "broccoli" }, { name: "Bread", sticker: "baguette" }] },
      { name: "Desserts", sticker: "cake", slots: [{ name: "Dessert", quantity: 2, sticker: "cake" }] },
      { name: "Drinks", sticker: "wine", slots: [{ name: "A bottle of wine", quantity: 3, sticker: "wine" }, { name: "Something non-alcoholic", sticker: "juice" }] },
    ],
  },
  {
    key: "park",
    name: "Park hang",
    blurb: "Blanket, spritzes, snacks",
    sticker: "basket",
    title: "Park hang",
    categories: [
      { name: "Drinks", sticker: "champagne", slots: [{ name: "Spritz supplies", sticker: "champagne" }, { name: "Seltzers", quantity: 2, sticker: "beer" }, { name: "Something non-alcoholic", sticker: "juice" }] },
      { name: "Snacks", sticker: "cheese", slots: [{ name: "Cheese and crackers", sticker: "cheese" }, { name: "Fruit", sticker: "watermelon" }, { name: "Chips and dip", sticker: "pretzel" }, { name: "Something sweet", sticker: "cookie" }] },
      { name: "Setup", sticker: "basket", slots: [{ name: "A picnic blanket", quantity: 2, sticker: "basket" }, { name: "A cooler with ice", sticker: "ice" }] },
    ],
  },
  {
    key: "house",
    name: "House party",
    blurb: "Drinks, snacks, ice",
    sticker: "cocktail",
    title: "House party",
    categories: [
      { name: "Drinks", sticker: "champagne", slots: [{ name: "Something bubbly", sticker: "champagne" }, { name: "Beer or seltzer", quantity: 2, sticker: "beer" }] },
      { name: "Snacks", sticker: "popcorn", slots: [{ name: "Chips and dip", sticker: "pretzel" }, { name: "Something sweet", sticker: "chocolate" }] },
      { name: "Supplies", sticker: "ice", slots: [{ name: "Ice", sticker: "ice" }, { name: "Cups", sticker: "cart" }] },
    ],
  },
  {
    key: "pregame",
    name: "Pregame",
    blurb: "Drinks before the night out",
    sticker: "glasses",
    title: "Pregame",
    categories: [
      { name: "Drinks", sticker: "champagne", slots: [{ name: "Something sparkling", sticker: "champagne" }, { name: "A bottle for cocktails", sticker: "whiskey" }, { name: "Seltzers", sticker: "beer" }] },
      { name: "Mixers", sticker: "lemon", slots: [{ name: "Mixers", sticker: "juice" }, { name: "Limes and lemons", sticker: "lemon" }, { name: "Ice", sticker: "ice" }] },
      { name: "Snacks", sticker: "pretzel", slots: [{ name: "Something salty", sticker: "pretzel" }] },
    ],
  },
];

export function getTemplate(key: string) {
  return TEMPLATES.find((t) => t.key === key);
}
