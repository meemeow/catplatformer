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
