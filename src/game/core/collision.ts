import type { Rect } from "../types";

/** Standard AABB overlap test. */
export const rectCollision = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Wraps a point in a box of radius `r`, so tracers can reuse `rectCollision`. */
export const pointRect = (x: number, y: number, r: number): Rect => ({
  x: x - r,
  y: y - r,
  w: r * 2,
  h: r * 2,
});
