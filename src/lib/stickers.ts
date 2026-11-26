// 3D stickers from Microsoft Fluent Emoji (MIT license): https://github.com/microsoft/fluentui-emoji
// Pinned to a commit so images never change under us. Add more keys as needed —
// paths follow `assets/<Name>/3D/<name>_3d.png` (skin-tone emoji live under `<Name>/Default/3D/`).
const BASE =
  "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets";

export const STICKERS = {
  plate: "Fork and knife with plate/3D/fork_and_knife_with_plate_3d.png",
  turkey: "Turkey/3D/turkey_3d.png",
  potato: "Potato/3D/potato_3d.png",
  bread: "Bread/3D/bread_3d.png",
  salad: "Green salad/3D/green_salad_3d.png",
  broccoli: "Broccoli/3D/broccoli_3d.png",
  pie: "Pie/3D/pie_3d.png",
  iceCream: "Ice cream/3D/ice_cream_3d.png",
  glasses: "Clinking glasses/3D/clinking_glasses_3d.png",
  champagne: "Bottle with popping cork/3D/bottle_with_popping_cork_3d.png",
  beer: "Beer mug/3D/beer_mug_3d.png",
  juice: "Cup with straw/3D/cup_with_straw_3d.png",
  ice: "Ice/3D/ice_3d.png",
  chair: "Chair/3D/chair_3d.png",
  broom: "Broom/3D/broom_3d.png",
  sponge: "Sponge/3D/sponge_3d.png",
  party: "Party popper/3D/party_popper_3d.png",
} as const;

export type StickerKey = keyof typeof STICKERS;

export function stickerUrl(key: StickerKey) {
  return `${BASE}/${encodeURI(STICKERS[key])}`;
}
