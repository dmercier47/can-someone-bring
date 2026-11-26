// Short, unguessable-enough share codes like "k3x9ab". No vowels-only words, no look-alikes (0/o, 1/l).
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function randomSlug(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
