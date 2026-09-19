/**
 * The game's colour palette.
 *
 * Kept in one place so the canvas art, which is generated rather than drawn by
 * hand, stays consistent across the sky, the terrain and the props.
 */

export const SKY = {
  // Sampled from the sky swatch on the asset sheet; the horizon matches the
  // haze the mountain layers wash toward, so the two meet without a seam.
  top: "#4f95dd",
  mid: "#6fb0e6",
  horizon: "#c3e2f4",
  sun: "rgba(255,247,214,1)",
  sunGlow: "rgba(255,214,120,0)",
} as const;

/**
 * The ground the world stands on, filling everything below the ranges.
 *
 * Solid earth rather than a tint over the sky: the lower half of a level is
 * meant to read as ground the player is inside, not as distance.
 *
 * It is `DIRT` carried toward a warm light, so it belongs to the same soil the
 * platforms are cut from without competing with them. Lighter than `DIRT.top`
 * where it meets the ranges and darker than `DIRT.bottom` at the foot of the
 * view, so a platform is never the same value as the ground behind it, wherever
 * on screen it happens to sit.
 */
export const EARTH = {
  /** Earth where the ground meets the ranges. */
  top: "#7b6348",
  /** Shadowed earth at the foot of the view. */
  deep: "#413526",
  /** `top` at zero alpha, so the ranges can settle into the ground. */
  clear: "rgba(123, 99, 72, 0)",
} as const;

export const GRASS = {
  highlight: "#7fd04f",
  top: "#5cb038",
  body: "#46912c",
  shadow: "#2f6c1f",
  deep: "#1f4c14",
} as const;

export const DIRT = {
  top: "#6b492b",
  mid: "#563a21",
  bottom: "#3f2a17",
  speckLight: "#7e5a38",
  speckDark: "#33210f",
  pebble: "#8f7658",
  root: "rgba(40,24,10,0.45)",
} as const;

/**
 * Ground too deep to catch any light.
 *
 * Below the lit rows the soil loses its texture entirely and is drawn flat:
 * that is what reads as depth, and it stops a tall bank looking like one tile
 * stamped over and over. The light falls off continuously instead of in
 * steps: the lit soil fades into `fill` at its foot, the row under it falls
 * from `fill` to `abyss`, and everything below that is `abyss`.
 */
/** Kept apart so the solid colour and the faded one cannot drift. */
const ABYSS_RGB = "11, 7, 6";

export const DEPTH = {
  fill: "#23171f",
  /** Near-black, with just enough warmth left in it to read as earth. */
  abyss: `rgb(${ABYSS_RGB})`,
  /** `fill` at zero alpha, so the lit soil above can fade down into it. */
  clear: "rgba(35,23,31,0)",
} as const;

/** `DEPTH.abyss` at a given strength, for fading the dark out over something. */
export const abyssAt = (alpha: number): string =>
  `rgba(${ABYSS_RGB}, ${alpha})`;

export const STONE = {
  brick: "#6c7a64",
  brickAlt: "#61705a",
  bevel: "#8d9b81",
  shade: "#47523f",
  mortar: "#2c3325",
  moss: "#4a8735",
  mossDark: "#325f25",
} as const;

export const ROCK = {
  light: "#8c9689",
  mid: "#6d7a6b",
  dark: "#4d574c",
  vein: "rgba(214,228,236,0.35)",
} as const;

export const LAVA = {
  deep: "#8f2b0c",
  body: "#e8451a",
  hot: "#ff8a2b",
  crust: "#ffd66b",
} as const;

export const WOOD = {
  light: "#a97c4d",
  mid: "#8a6038",
  dark: "#5f4023",
  grain: "rgba(60,38,18,0.35)",
} as const;
