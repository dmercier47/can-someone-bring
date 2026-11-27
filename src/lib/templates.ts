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
    key: "friendsgiving",
    name: "Friendsgiving",
    blurb: "Potluck with all the classics",
    sticker: "turkey",
    title: "Friendsgiving",
    categories: [
      {
        name: "Sides",
        sticker: "potato",
        slots: [
          { name: "Mashed potatoes", sticker: "potato" },
          { name: "Stuffing", sticker: "bread" },
          { name: "A veggie side", quantity: 2, note: "Green beans, sprouts, salad…", sticker: "broccoli" },
          { name: "Mac & cheese", sticker: "pasta" },
        ],
      },
      { name: "Desserts", sticker: "pie", slots: [{ name: "A pie", quantity: 2, sticker: "pie" }] },
      { name: "Drinks", sticker: "glasses", slots: [{ name: "Wine", quantity: 2, sticker: "wine" }, { name: "Cider or seltzer", sticker: "beer" }] },
    ],
  },
  {
    key: "bbq",
    name: "BBQ",
    blurb: "Sides, cold drinks, dessert",
    sticker: "burger",
    title: "Backyard BBQ",
    categories: [
      { name: "Sides", sticker: "salad", slots: [{ name: "Pasta or potato salad", sticker: "pasta" }, { name: "A green salad", sticker: "salad" }, { name: "Chips and dip", sticker: "pretzel" }, { name: "Fruit", sticker: "watermelon" }] },
      { name: "Drinks", sticker: "beer", slots: [{ name: "Beer or seltzer", quantity: 2, sticker: "beer" }, { name: "Soda or lemonade", sticker: "juice" }] },
      { name: "Desserts", sticker: "iceCream", slots: [{ name: "Something sweet", sticker: "cookie" }] },
      { name: "Supplies", sticker: "ice", slots: [{ name: "Ice", sticker: "ice" }] },
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
];

export function getTemplate(key: string) {
  return TEMPLATES.find((t) => t.key === key);
}
