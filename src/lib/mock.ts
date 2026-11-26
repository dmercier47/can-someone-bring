import type { Sheet } from "./types";

// Temporary mock data until Supabase is wired up (see SPEC.md build order).
const sheets: Sheet[] = [
  {
    id: "sheet_demo",
    slug: "demo",
    title: "Friendsgiving",
    hostName: "Sam",
    startsAt: "2026-11-28T18:00:00-05:00",
    timeZone: "America/New_York",
    location: "Sam's place · Brooklyn",
    hostNote: "I've got the turkey and wine covered! Grab anything below, or add your own.",
    partifulUrl: "https://partiful.com",
    allowGuestItems: true,
    categories: [
      {
        id: "cat_sides",
        name: "Sides",
        sticker: "potato",
        slots: [
          { id: "slot_mash", name: "Mashed potatoes", quantity: 1, sticker: "potato" },
          { id: "slot_stuffing", name: "Stuffing", quantity: 1, sticker: "bread" },
          { id: "slot_veg", name: "A veggie side", quantity: 2, note: "Green beans, sprouts, salad…", sticker: "broccoli" },
          { id: "slot_rolls", name: "Rolls", quantity: 1, sticker: "bread" },
        ],
      },
      {
        id: "cat_dessert",
        name: "Desserts",
        sticker: "pie",
        slots: [
          { id: "slot_pie", name: "A pie", quantity: 2, sticker: "pie" },
          { id: "slot_icecream", name: "Ice cream", quantity: 1, sticker: "iceCream" },
        ],
      },
      {
        id: "cat_drinks",
        name: "Drinks",
        sticker: "glasses",
        slots: [
          { id: "slot_cider", name: "Cider or seltzer", quantity: 2, sticker: "beer" },
          { id: "slot_na", name: "Something non-alcoholic", quantity: 1, sticker: "juice" },
        ],
      },
      {
        id: "cat_supplies",
        name: "Supplies",
        sticker: "chair",
        slots: [
          { id: "slot_ice", name: "Ice", quantity: 2, note: "A bag each", sticker: "ice" },
          { id: "slot_chairs", name: "Folding chairs", quantity: 1, note: "We're 2 short", sticker: "chair" },
        ],
      },
      {
        id: "cat_help",
        name: "Help out",
        sticker: "broom",
        slots: [
          { id: "slot_setup", name: "Come early to set up", quantity: 2, note: "5:00pm" },
          { id: "slot_dishes", name: "Dish duty", quantity: 2, sticker: "sponge" },
        ],
      },
    ],
    claims: [
      { id: "c1", slotId: "slot_mash", guestName: "Maya", detail: "Garlic mash" },
      { id: "c2", slotId: "slot_pie", guestName: "Jordan", detail: "Pumpkin", dietaryNote: "Vegetarian" },
      { id: "c3", slotId: "slot_veg", guestName: "Priya", detail: "Roasted sprouts" },
      { id: "c4", slotId: "slot_cider", guestName: "Alex" },
      { id: "c5", slotId: "slot_ice", guestName: "Chris" },
      { id: "c6", slotId: "slot_ice", guestName: "Taylor" },
      { id: "c7", slotId: "slot_dishes", guestName: "Rae" },
    ],
  },
];

export async function getSheetBySlug(slug: string): Promise<Sheet | null> {
  return sheets.find((s) => s.slug === slug) ?? null;
}
