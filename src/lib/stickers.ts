// 3D stickers from Microsoft Fluent Emoji (MIT license): https://github.com/microsoft/fluentui-emoji
// Pinned to a commit so images never change under us. Add more keys as needed —
// paths follow `assets/<Name>/3D/<name>_3d.png` (skin-tone emoji live under `<Name>/Default/3D/`).
// Check a new URL returns 200 before adding it.
const BASE =
  "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets";

export const STICKERS = {
  plate: "Fork and knife with plate/3D/fork_and_knife_with_plate_3d.png",
  turkey: "Turkey/3D/turkey_3d.png",
  poultry: "Poultry leg/3D/poultry_leg_3d.png",
  meat: "Cut of meat/3D/cut_of_meat_3d.png",
  burger: "Hamburger/3D/hamburger_3d.png",
  hotDog: "Hot dog/3D/hot_dog_3d.png",
  pizza: "Pizza/3D/pizza_3d.png",
  taco: "Taco/3D/taco_3d.png",
  pasta: "Spaghetti/3D/spaghetti_3d.png",
  casserole: "Shallow pan of food/3D/shallow_pan_of_food_3d.png",
  soup: "Steaming bowl/3D/steaming_bowl_3d.png",
  potato: "Potato/3D/potato_3d.png",
  corn: "Ear of corn/3D/ear_of_corn_3d.png",
  bread: "Bread/3D/bread_3d.png",
  baguette: "Baguette bread/3D/baguette_bread_3d.png",
  croissant: "Croissant/3D/croissant_3d.png",
  salad: "Green salad/3D/green_salad_3d.png",
  greens: "Leafy green/3D/leafy_green_3d.png",
  broccoli: "Broccoli/3D/broccoli_3d.png",
  cheese: "Cheese wedge/3D/cheese_wedge_3d.png",
  watermelon: "Watermelon/3D/watermelon_3d.png",
  popcorn: "Popcorn/3D/popcorn_3d.png",
  pretzel: "Pretzel/3D/pretzel_3d.png",
  pie: "Pie/3D/pie_3d.png",
  cake: "Birthday cake/3D/birthday_cake_3d.png",
  cupcake: "Cupcake/3D/cupcake_3d.png",
  cookie: "Cookie/3D/cookie_3d.png",
  doughnut: "Doughnut/3D/doughnut_3d.png",
  chocolate: "Chocolate bar/3D/chocolate_bar_3d.png",
  iceCream: "Ice cream/3D/ice_cream_3d.png",
  glasses: "Clinking glasses/3D/clinking_glasses_3d.png",
  wine: "Wine glass/3D/wine_glass_3d.png",
  champagne: "Bottle with popping cork/3D/bottle_with_popping_cork_3d.png",
  beer: "Beer mug/3D/beer_mug_3d.png",
  cocktail: "Tropical drink/3D/tropical_drink_3d.png",
  whiskey: "Tumbler glass/3D/tumbler_glass_3d.png",
  juice: "Cup with straw/3D/cup_with_straw_3d.png",
  tea: "Teacup without handle/3D/teacup_without_handle_3d.png",
  bubbleTea: "Bubble tea/3D/bubble_tea_3d.png",
  ice: "Ice/3D/ice_3d.png",
  chair: "Chair/3D/chair_3d.png",
  candle: "Candle/3D/candle_3d.png",
  music: "Musical notes/3D/musical_notes_3d.png",
  cart: "Shopping cart/3D/shopping_cart_3d.png",
  broom: "Broom/3D/broom_3d.png",
  sponge: "Sponge/3D/sponge_3d.png",
  party: "Party popper/3D/party_popper_3d.png",
} as const;

export type StickerKey = keyof typeof STICKERS;
export const STICKER_KEYS = Object.keys(STICKERS) as StickerKey[];

export function isSticker(key: unknown): key is StickerKey {
  return typeof key === "string" && key in STICKERS;
}

export function stickerUrl(key: StickerKey) {
  return `${BASE}/${encodeURI(STICKERS[key])}`;
}

// Keyword → sticker, checked in order (first match wins), so put specific words first.
const GUESSES: [RegExp, StickerKey][] = [
  [/ice ?cream|gelato|sorbet/, "iceCream"],
  [/\bice\b|ice bag/, "ice"],
  [/pie|tart|cobbler/, "pie"],
  [/cupcake/, "cupcake"],
  [/cake/, "cake"],
  [/cookie|brownie/, "cookie"],
  [/donut|doughnut/, "doughnut"],
  [/chocolate|candy|sweets/, "chocolate"],
  [/dessert/, "cake"],
  [/turkey/, "turkey"],
  [/chicken|wing|drumstick/, "poultry"],
  [/burger/, "burger"],
  [/hot ?dog|sausage|brat/, "hotDog"],
  [/steak|meat|ribs|brisket|ham\b/, "meat"],
  [/pizza/, "pizza"],
  [/taco|burrito|nacho|quesadilla/, "taco"],
  [/pasta|spaghetti|noodle|lasagna|mac/, "pasta"],
  [/dish duty|dishes|clean|wash/, "sponge"],
  [/casserole|bake\b|main|entree|entrée|side dish/, "casserole"],
  [/soup|stew|chili|curry/, "soup"],
  [/potato|mash|fries/, "potato"],
  [/corn/, "corn"],
  [/baguette/, "baguette"],
  [/croissant|pastry|pastries|muffin|brunch/, "croissant"],
  [/bread|roll|bun|biscuit|stuffing/, "bread"],
  [/salad/, "salad"],
  [/green|kale|spinach|lettuce/, "greens"],
  [/veg|broccoli|sprout|bean/, "broccoli"],
  [/cheese|charcuterie|board/, "cheese"],
  [/fruit|watermelon|melon|berries/, "watermelon"],
  [/popcorn/, "popcorn"],
  [/chip|pretzel|snack|cracker|dip|salsa/, "pretzel"],
  [/champagne|prosecco|bubbly|sparkling/, "champagne"],
  [/wine|rosé|rose\b/, "wine"],
  [/beer|cider|seltzer|ipa|lager/, "beer"],
  [/cocktail|margarita|mixer|punch|sangria/, "cocktail"],
  [/whiskey|bourbon|liquor|vodka|tequila|gin|rum|spirit/, "whiskey"],
  [/tea|coffee/, "tea"],
  [/juice|soda|non-?alc|lemonade|water|na\b/, "juice"],
  [/drink|bev/, "glasses"],
  [/chair|seat|table/, "chair"],
  [/candle|decor|flower/, "candle"],
  [/music|speaker|playlist/, "music"],
  [/plate|cup|napkin|utensil|fork|supplies/, "cart"],
  [/help|set ?up|setup|early|sweep/, "broom"],
];

/** Best-guess sticker for a free-text item name, e.g. "Pumpkin pie" → pie. */
export function guessSticker(name: string): StickerKey | undefined {
  const n = name.toLowerCase();
  return GUESSES.find(([re]) => re.test(n))?.[1];
}
