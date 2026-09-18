import {
  CUTTER_SCALE,
  SCALE,
  SNIPER_PICKUP_WIDTH_PX,
  WEAPON_PICKUP_WIDTH_PX,
} from "../constants";
import type { Camera, Player, WeaponType } from "../types";
import type { SpriteAtlas } from "./sprites";
import { weaponDrawHeight } from "./sprites";

/** The DOM nodes the player is drawn with. */
export interface PlayerSpriteElements {
  /** Animated GIF of the cat. */
  body: HTMLImageElement | null;
  /** Held weapon, positioned relative to the body. */
  weapon: HTMLImageElement | null;
  /** Canvas holding a frozen frame, shown when the cat is standing still. */
  overlay: HTMLCanvasElement | null;
}

export interface PlayerSpriteState {
  /** While dying, the cat is hidden entirely and the death effect takes over. */
  deathActive: boolean;
  /** False freezes the GIF onto the overlay canvas. */
  animate: boolean;
  hasWeapon: boolean;
  weaponType: WeaponType | null;
  /** The cutter replaces whatever weapon is held, at a smaller size. */
  cutterGiven: boolean;
  /** No weapon is ever drawn during the intro. */
  introActive: boolean;
  /** Extra scale applied while celebrating. */
  happyScale: number;
}

/** Size and placement of the weapon in the player's hands. */
interface HeldWeapon {
  img: HTMLImageElement;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Works out which weapon image to draw and how big.
 *
 * The held weapon deliberately matches the on-ground pickup size, so picking
 * one up does not change its apparent scale.
 */
const measureHeldWeapon = (
  player: Player,
  state: PlayerSpriteState,
  atlas: SpriteAtlas,
  bodyWidth: number,
  bodyHeight: number,
  facingRight: boolean,
): HeldWeapon | null => {
  if (!state.hasWeapon || !state.weaponType || state.introActive) return null;

  const img = state.cutterGiven
    ? atlas.cutter
    : state.weaponType === "sniper"
      ? atlas.sniper
      : atlas.sheriff;

  const baseWidth =
    state.cutterGiven || state.weaponType === "sniper"
      ? SNIPER_PICKUP_WIDTH_PX
      : WEAPON_PICKUP_WIDTH_PX;
  const worldWidth = Math.round(baseWidth * (state.cutterGiven ? CUTTER_SCALE : 1));
  const worldHeight = weaponDrawHeight(img, worldWidth, Math.round(player.h * 2.2));

  const width = Math.round(worldWidth * SCALE);
  const height = Math.round(worldHeight * SCALE);

  return {
    img,
    width,
    height,
    offsetX: facingRight
      ? Math.round(bodyWidth - width * 0.5)
      : Math.round(-width * 0.5),
    offsetY: Math.round(bodyHeight * 0.25),
  };
};

/**
 * Draws the player each frame.
 *
 * Two modes: while moving, the animated GIF element is positioned directly.
 * While still, the current GIF frame is copied into an overlay canvas so the
 * animation appears to stop — a GIF cannot be paused any other way. The overlay
 * is widened on whichever side the weapon extends to, so long guns are not
 * clipped.
 */
export const drawPlayerSprite = (
  player: Player,
  camera: Camera,
  elements: PlayerSpriteElements,
  state: PlayerSpriteState,
  atlas: SpriteAtlas,
): void => {
  const { body, weapon, overlay } = elements;

  if (state.deathActive) {
    if (body) body.style.display = "none";
    if (overlay) overlay.style.display = "none";
    if (weapon) weapon.style.display = "none";
    return;
  }

  if (!body) return;

  const screenX = Math.round((Math.round(player.x) - camera.x) * SCALE);
  const screenY = Math.round((Math.round(player.y) - camera.y) * SCALE);
  const width = Math.round(player.w * SCALE);
  const height = Math.round(player.h * SCALE);
  const facingRight = player.dir > 0;

  const held = measureHeldWeapon(player, state, atlas, width, height, facingRight);

  if (state.animate) {
    drawAnimated(body, overlay, screenX, screenY, width, height, facingRight, state);
  } else {
    drawFrozen(body, overlay, screenX, screenY, width, height, facingRight, held);
  }

  placeHeldWeapon(weapon, held, screenX, screenY, facingRight, !state.animate);
};

const drawAnimated = (
  body: HTMLImageElement,
  overlay: HTMLCanvasElement | null,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  facingRight: boolean,
  state: PlayerSpriteState,
): void => {
  body.style.left = `${screenX}px`;
  body.style.top = `${screenY}px`;
  body.style.width = `${width}px`;
  body.style.height = `${height}px`;

  const scale = state.happyScale > 0 ? state.happyScale : 1;
  // The art faces left, so facing right means mirroring it.
  body.style.transform = facingRight
    ? `scaleX(-1) scale(${scale})`
    : `scaleX(1) scale(${scale})`;
  body.style.display = "block";

  if (overlay) {
    overlay.style.display = "none";
    overlay.style.transform = "rotate(0deg)";
  }
};

const drawFrozen = (
  body: HTMLImageElement,
  overlay: HTMLCanvasElement | null,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
  facingRight: boolean,
  held: HeldWeapon | null,
): void => {
  body.style.display = "none";
  if (!overlay) return;

  // Pad the side the weapon sticks out on so it stays inside the canvas.
  const weaponWidth = held?.width ?? 0;
  const padLeft = facingRight ? 0 : Math.round(weaponWidth * 0.5);
  const padRight = facingRight ? Math.round(weaponWidth * 0.5) : 0;

  overlay.width = padLeft + width + padRight;
  overlay.height = height;

  const ctx = overlay.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    drawMirrored(ctx, facingRight, padLeft + width, () => {
      ctx.drawImage(body, facingRight ? 0 : padLeft, 0, width, height);
    });

    if (held) {
      const offsetX = padLeft + held.offsetX;
      drawMirrored(ctx, facingRight, padLeft + width, () => {
        // Inside a mirrored context the x axis is flipped, so convert the
        // target position into the flipped coordinate space.
        const x = facingRight
          ? Math.round(padLeft + width - offsetX - held.width)
          : offsetX;
        ctx.drawImage(held.img, x, held.offsetY, held.width, held.height);
      });
    }
  }

  overlay.style.left = `${screenX - padLeft}px`;
  overlay.style.top = `${screenY}px`;
  overlay.style.display = "block";
};

/** Runs `draw` inside a horizontally flipped context when `mirror` is true. */
const drawMirrored = (
  ctx: CanvasRenderingContext2D,
  mirror: boolean,
  axis: number,
  draw: () => void,
): void => {
  if (!mirror) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(axis, 0);
  ctx.scale(-1, 1);
  draw();
  ctx.restore();
};

/**
 * The weapon stays a real DOM element in both modes; drawing it only into the
 * overlay would clip the sniper, which is wider than the cat.
 */
const placeHeldWeapon = (
  el: HTMLImageElement | null,
  held: HeldWeapon | null,
  screenX: number,
  screenY: number,
  facingRight: boolean,
  raiseAboveOverlay: boolean,
): void => {
  if (!el) return;
  if (!held) {
    el.style.display = "none";
    return;
  }

  el.src = held.img.src;
  el.style.left = `${screenX + held.offsetX}px`;
  el.style.top = `${screenY + held.offsetY}px`;
  el.style.width = `${held.width}px`;
  el.style.height = `${held.height}px`;
  el.style.transform = facingRight ? "scaleX(-1)" : "scaleX(1)";
  if (raiseAboveOverlay) el.style.zIndex = "3";
  el.style.display = "block";
};
