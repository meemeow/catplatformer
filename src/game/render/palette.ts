/**
 * The game's colour palette.
 *
 * Kept in one place so the canvas art, which is generated rather than drawn by
 * hand, stays consistent across the sky, the terrain and the props.
 */

export const SKY = {
  top: "#3f8ed0",
  mid: "#74bce6",
  horizon: "#c3e6f4",
  sun: "rgba(255,247,214,1)",
  sunGlow: "rgba(255,214,120,0)",
} as const;

export const CLOUD = {
  body: "#ffffff",
  shade: "#d9e9f6",
  rim: "#bcd6e9",
} as const;

/** Far layers are paler and bluer, which reads as distance. */
export const MOUNTAIN = [
  { base: "#93b2cc", light: "#c2d9ea", foot: 140, peaks: 5, parallax: 0.18 },
  { base: "#6f93b6", light: "#9cbad4", foot: 200, peaks: 4, parallax: 0.36 },
  { base: "#4f6f8e", light: "#7893b0", foot: 260, peaks: 3, parallax: 0.6 },
] as const;

export const GRASS = {
  highlight: "#8ade5c",
  top: "#6ec244",
  body: "#54a232",
  shadow: "#3c7a25",
  deep: "#2e5c1c",
} as const;

export const DIRT = {
  top: "#7c5433",
  mid: "#5f3f26",
  bottom: "#48301c",
  speckLight: "#8b6540",
  speckDark: "#3c2716",
  pebble: "#9d8468",
  root: "rgba(48,28,14,0.42)",
} as const;

export const STONE = {
  brick: "#78866f",
  brickAlt: "#6d7b65",
  bevel: "#98a68c",
  shade: "#55614f",
  mortar: "#39412f",
  moss: "#4f8f3a",
  mossDark: "#3a6b2a",
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
