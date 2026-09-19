/**
 * Image loading for the canvas renderers.
 *
 * Every terrain and background sprite is diced out of one sheet, so they all
 * load the same way: the request starts the first time a renderer asks for the
 * image, and readiness is checked per frame. Nothing here throws or waits — a
 * renderer that finds a texture unready falls back to its procedural art, so
 * the first frames after a cold load still draw terrain rather than nothing.
 */

import { TERRAIN } from "../assets";

const cache = new Map<string, HTMLImageElement>();

const texture = (src: string): HTMLImageElement => {
  let image = cache.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    cache.set(src, image);
  }
  return image;
};

/** False until the bytes have arrived; a broken file stays false forever. */
export const isReady = (image: HTMLImageElement): boolean =>
  image.complete && image.naturalWidth > 0;

export const TEXTURES = {
  cloud: TERRAIN.clouds.map(texture),
  peak: texture(TERRAIN.peak),
  range: texture(TERRAIN.range),
  rock: texture(TERRAIN.rock),
  brick: texture(TERRAIN.brick),
  dirt: TERRAIN.dirt.map(texture),
  grass: TERRAIN.grass.map(texture),
} as const;
