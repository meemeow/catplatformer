import { TILE, WEAPONS } from "../constants";
import type { GameMap } from "../core/map";
import type { Ammo, Boss, Player, WeaponType } from "../types";

/** Where bullets leave the player, in world coordinates. */
export const muzzlePosition = (player: Player) => ({
  x: player.x + player.w / 2,
  y: player.y + player.h / 2,
});

/**
 * Aim point for a shot fired without a target, i.e. straight ahead.
 *
 * The sheriff aims past the edge of the map so its round crosses the whole
 * level; the sniper aims at the centre of its melee-range box.
 */
export const forwardAimPoint = (
  player: Player,
  weapon: WeaponType,
  map: GameMap,
) => {
  const range = TILE * WEAPONS[weapon].meleeRangeTiles;
  const boxX = player.dir > 0 ? player.x + player.w : player.x - range;
  const boxH = player.h * 0.7;
  const boxY = player.y + (player.h - boxH) / 2;

  const x =
    weapon === "sheriff"
      ? player.dir > 0
        ? map.widthPx + TILE
        : -TILE
      : boxX + range / 2;

  return { x, y: boxY + boxH / 2 };
};

/** Centre of the boss, used as the aim point for a click-to-shoot. */
export const bossAimPoint = (boss: Boss) => ({
  x: boss.x + boss.w / 2,
  y: boss.y + boss.h / 2,
});

/** True when the click landed inside the boss's box. */
export const isPointOnBoss = (boss: Boss, worldX: number, worldY: number): boolean =>
  worldX >= boss.x &&
  worldX <= boss.x + boss.w &&
  worldY >= boss.y &&
  worldY <= boss.y + boss.h;

export interface FireGate {
  reloading: boolean;
  nextShotAllowedAt: number;
  ammo: Ammo;
  hasWeapon: boolean;
}

/** Whether a shot may be fired right now. */
export const canFire = (gate: FireGate, now: number): boolean =>
  gate.hasWeapon &&
  !gate.reloading &&
  now >= gate.nextShotAllowedAt &&
  gate.ammo.mag > 0;

/** Ammo state after consuming one round. */
export const consumeRound = (ammo: Ammo): Ammo => ({
  mag: Math.max(0, ammo.mag - 1),
  reserve: ammo.reserve,
  magSize: ammo.magSize,
});

/** Ammo state after a completed reload, drawing from the reserve. */
export const applyReload = (ammo: Ammo): Ammo => {
  const needed = ammo.magSize - ammo.mag;
  const taken = Math.min(needed, ammo.reserve);
  return {
    mag: ammo.mag + taken,
    reserve: ammo.reserve - taken,
    magSize: ammo.magSize,
  };
};

/** Starting ammo for a weapon, or an empty mag when unarmed. */
export const initialAmmo = (weapon: WeaponType | null): Ammo => {
  if (!weapon) return { mag: 0, reserve: 0, magSize: WEAPONS.sheriff.magSize };
  const stats = WEAPONS[weapon];
  return {
    mag: stats.startingMag,
    reserve: stats.startingReserve,
    magSize: stats.magSize,
  };
};

/** The sheriff can reload; the sniper's five rounds are all it ever gets. */
export const canReload = (weapon: WeaponType | null, ammo: Ammo): boolean =>
  weapon === "sheriff" && ammo.mag < ammo.magSize && ammo.reserve > 0;

/** True when a weapon has no rounds left anywhere. */
export const isFullyEmpty = (ammo: Ammo): boolean =>
  ammo.mag === 0 && ammo.reserve === 0;
