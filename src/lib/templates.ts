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

const help: TemplateCategory = {
  name: "Help out",
  sticker: "broom",
  slots: [
    { name: "Come early to set up", quantity: 2, sticker: "broom" },
    { name: "Dish duty", quantity: 2, sticker: "sponge" },
  ],
};

export const TEMPLATES: Template[] = [
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
          { name: "Rolls", sticker: "bread" },
          { name: "Cranberry sauce" },
        ],
      },
      { name: "Desserts", sticker: "pie", slots: [{ name: "A pie", quantity: 2, sticker: "pie" }, { name: "Ice cream", sticker: "iceCream" }] },
      { name: "Drinks", sticker: "glasses", slots: [{ name: "Wine", quantity: 2, sticker: "wine" }, { name: "Cider or seltzer", quantity: 2, sticker: "beer" }, { name: "Something non-alcoholic", sticker: "juice" }] },
      { name: "Supplies", sticker: "chair", slots: [{ name: "Ice", quantity: 2, note: "A bag each", sticker: "ice" }, { name: "Folding chairs", sticker: "chair" }] },
      help,
    ],
  },
  {
    key: "bbq",
    name: "BBQ",
    blurb: "Grill, sides, cold drinks",
    sticker: "burger",
    title: "Backyard BBQ",
    categories: [
      { name: "For the grill", sticker: "burger", slots: [{ name: "Burgers", sticker: "burger" }, { name: "Hot dogs or sausages", sticker: "hotDog" }, { name: "Something veggie to grill", sticker: "corn" }] },
      { name: "Sides", sticker: "salad", slots: [{ name: "Pasta or potato salad", sticker: "pasta" }, { name: "A green salad", sticker: "salad" }, { name: "Chips and dip", quantity: 2, sticker: "pretzel" }, { name: "Fruit", sticker: "watermelon" }] },
      { name: "Drinks", sticker: "beer", slots: [{ name: "Beer or seltzer", quantity: 3, sticker: "beer" }, { name: "Soda or lemonade", quantity: 2, sticker: "juice" }] },
      { name: "Supplies", sticker: "ice", slots: [{ name: "Ice", quantity: 2, sticker: "ice" }, { name: "Plates, cups, napkins", sticker: "cart" }, { name: "Speaker", sticker: "music" }] },
      { name: "Desserts", sticker: "iceCream", slots: [{ name: "Something sweet", quantity: 2, sticker: "cookie" }] },
    ],
  },
  {
    key: "house",
    name: "House party",
    blurb: "Drinks, snacks, good music",
    sticker: "party",
    title: "House party",
    categories: [
      { name: "Drinks", sticker: "champagne", slots: [{ name: "Something bubbly", quantity: 2, sticker: "champagne" }, { name: "Beer or seltzer", quantity: 3, sticker: "beer" }, { name: "A bottle for cocktails", quantity: 2, sticker: "whiskey" }] },
      { name: "Mixers", sticker: "cocktail", slots: [{ name: "Mixers and juice", quantity: 2, sticker: "juice" }, { name: "Limes and garnishes", sticker: "cocktail" }] },
      { name: "Snacks", sticker: "popcorn", slots: [{ name: "Chips and dip", quantity: 2, sticker: "pretzel" }, { name: "Something sweet", sticker: "chocolate" }, { name: "Late-night pizza fund", note: "Chip in a few bucks", sticker: "pizza" }] },
      { name: "Supplies", sticker: "ice", slots: [{ name: "Ice", quantity: 3, sticker: "ice" }, { name: "Cups", sticker: "cart" }, { name: "A playlist", sticker: "music" }] },
      help,
    ],
  },
  {
    key: "blank",
    name: "Start from scratch",
    blurb: "Add your own categories",
    sticker: "party",
    title: "",
    categories: [{ name: "Things to bring", sticker: "plate", slots: [{ name: "Something to share", quantity: 3, sticker: "plate" }] }],
  },
];

export function getTemplate(key: string) {
  return TEMPLATES.find((t) => t.key === key);
}
